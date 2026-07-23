/**
 * NovaMap — production map widget.
 *
 * Providers:
 *   1. Google Maps JS API when VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY (or
 *      VITE_GOOGLE_MAPS_BROWSER_KEY) is present.
 *   2. Automatic Leaflet + OpenStreetMap fallback (keyless) when Google is
 *      unavailable / script blocked / key missing.
 *
 * Features:
 *   • Route polylines with haversine distance labels.
 *   • Point markers (farms, fields, warehouses…) with popups.
 *   • Polygon overlays (field boundaries) with tooltips.
 *   • OpenWeatherMap tile overlay (precipitation) when VITE_OPENWEATHER_API_KEY set.
 *   • Geolocation control with Permissions API pre-check + humanised errors.
 *   • Auto fit-bounds across every renderable feature.
 *   • Resilient teardown (double-mount safe under React 19 StrictMode).
 *
 * SSR-safe: must be rendered behind <ClientOnly> (uses window/navigator/Leaflet).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LocateFixed, Map as MapIcon, AlertCircle, CloudRain, Loader2, RefreshCw } from "lucide-react";
import { lookupCoords, type LatLon } from "@/lib/geo-coords";
import { cn } from "@/lib/utils";

export type MapRoute = {
  id: string;
  label?: string;
  origin: string;
  destination: string;
  color?: string;
};

export type MapMarker = {
  id: string;
  lat: number;
  lon: number;
  label?: string;
  description?: string;
  color?: string;
};

export type MapPolygon = {
  id: string;
  label?: string;
  color?: string;
  path: Array<{ lat: number; lon: number }>;
};

type Provider = "google" | "osm" | "loading" | "error";

type Props = {
  routes?: MapRoute[];
  markers?: MapMarker[];
  polygons?: MapPolygon[];
  height?: number;
  className?: string;
  /** Show weather (precipitation) tile overlay toggle. Requires VITE_OPENWEATHER_API_KEY for real tiles. */
  enableWeatherLayer?: boolean;
  /** Show the geolocation button (default true). */
  enableLocate?: boolean;
};

// ---- Utilities ----
function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function fmtKm(km: number) {
  return km >= 100 ? `${Math.round(km).toLocaleString()} km` : `${km.toFixed(1)} km`;
}
function humanGeoError(err: GeolocationPositionError): string {
  switch (err.code) {
    case 1: return "Location permission denied. Enable it in your browser settings.";
    case 2: return "Location unavailable. Check your device's GPS or network.";
    case 3: return "Locating timed out. Please try again.";
    default: return err.message || "Unable to get your location.";
  }
}

export default function NovaMap({
  routes = [],
  markers = [],
  polygons = [],
  height = 360,
  className,
  enableWeatherLayer = false,
  enableLocate = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [provider, setProvider] = useState<Provider>("loading");
  const [error, setError] = useState<string | null>(null);
  const [weatherOn, setWeatherOn] = useState(false);
  const [locating, setLocating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const apiRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const weatherLayerRef = useRef<any>(null);

  const googleKey =
    (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined);
  const owmKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;

  const resolvedRoutes = routes
    .map((r) => {
      const from = lookupCoords(r.origin);
      const to = lookupCoords(r.destination);
      return from && to ? { route: r, from, to, km: haversineKm(from, to) } : null;
    })
    .filter((x): x is { route: MapRoute; from: LatLon; to: LatLon; km: number } => x !== null);

  const hasAnyFeature = resolvedRoutes.length + markers.length + polygons.length > 0;

  // ---- Initialise map ----
  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;
    setProvider("loading");
    setError(null);

    async function initLeaflet() {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !node) return;

        const map = L.map(node, { zoomControl: true, attributionControl: true, worldCopyJump: true })
          .setView([20, 10], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(map);

        const bounds = L.latLngBounds([]);

        // Routes
        resolvedRoutes.forEach(({ route, from, to, km }) => {
          const color = route.color ?? "#10b981";
          const originIcon = L.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>`,
          });
          const destIcon = L.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;border-radius:2px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>`,
          });
          L.marker([from.lat, from.lon], { icon: originIcon }).addTo(map)
            .bindPopup(`<b>${escapeHtml(route.label ?? route.id)}</b><br/>Origin: ${escapeHtml(route.origin)}<br/>Distance: ${fmtKm(km)}`);
          L.marker([to.lat, to.lon], { icon: destIcon }).addTo(map)
            .bindPopup(`<b>${escapeHtml(route.label ?? route.id)}</b><br/>Destination: ${escapeHtml(route.destination)}<br/>Distance: ${fmtKm(km)}`);
          const line = L.polyline(
            [[from.lat, from.lon], [to.lat, to.lon]],
            { color, weight: 2, opacity: 0.8, dashArray: "6 6" }
          ).addTo(map);
          line.bindTooltip(fmtKm(km), { permanent: false, direction: "center", className: "nova-map-dist" });
          bounds.extend([from.lat, from.lon]).extend([to.lat, to.lon]);
        });

        // Markers
        markers.forEach((m) => {
          const color = m.color ?? "#059669";
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          });
          const marker = L.marker([m.lat, m.lon], { icon }).addTo(map);
          if (m.label || m.description) {
            marker.bindPopup(
              `<b>${escapeHtml(m.label ?? "")}</b>${m.description ? `<br/>${escapeHtml(m.description)}` : ""}`
            );
          }
          bounds.extend([m.lat, m.lon]);
        });

        // Polygons
        polygons.forEach((p) => {
          if (p.path.length < 3) return;
          const color = p.color ?? "#10b981";
          const poly = L.polygon(p.path.map((pt) => [pt.lat, pt.lon]) as any, {
            color, weight: 2, fillColor: color, fillOpacity: 0.15,
          }).addTo(map);
          if (p.label) poly.bindTooltip(p.label, { sticky: true });
          poly.getLatLngs().flat().forEach((ll: any) => bounds.extend(ll));
        });

        if (hasAnyFeature && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
        }

        // Ensure sizing after mount (parent can be display:none/flex etc.)
        setTimeout(() => { try { map.invalidateSize(); } catch { /* noop */ } }, 100);

        apiRef.current = { L, map, kind: "osm" as const };
        setProvider("osm");
      } catch (e: any) {
        setError(e?.message ?? "Map failed to load");
        setProvider("error");
      }
    }

    function initGoogle() {
      const cb = `__novaMapInit_${Math.random().toString(36).slice(2)}`;
      (window as any)[cb] = () => {
        if (cancelled || !node) return;
        try {
          const g = (window as any).google;
          const map = new g.maps.Map(node, {
            center: { lat: 20, lng: 10 },
            zoom: 2,
            disableDefaultUI: false,
            gestureHandling: "greedy",
          });
          const bounds = new g.maps.LatLngBounds();

          resolvedRoutes.forEach(({ route, from, to, km }) => {
            const color = route.color ?? "#10b981";
            new g.maps.Marker({
              map, position: { lat: from.lat, lng: from.lon },
              title: `${route.label ?? route.id} — ${route.origin} (${fmtKm(km)})`,
            });
            new g.maps.Marker({
              map, position: { lat: to.lat, lng: to.lon },
              title: `${route.label ?? route.id} — ${route.destination} (${fmtKm(km)})`,
              icon: { path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 4, strokeColor: color },
            });
            new g.maps.Polyline({
              map,
              path: [{ lat: from.lat, lng: from.lon }, { lat: to.lat, lng: to.lon }],
              strokeColor: color, strokeOpacity: 0.8, strokeWeight: 2, geodesic: true,
            });
            bounds.extend({ lat: from.lat, lng: from.lon });
            bounds.extend({ lat: to.lat, lng: to.lon });
          });

          markers.forEach((m) => {
            const marker = new g.maps.Marker({
              map, position: { lat: m.lat, lng: m.lon },
              title: m.label ?? "",
            });
            if (m.label || m.description) {
              const info = new g.maps.InfoWindow({
                content: `<div style="font:12px system-ui"><b>${escapeHtml(m.label ?? "")}</b>${m.description ? `<br/>${escapeHtml(m.description)}` : ""}</div>`,
              });
              marker.addListener("click", () => info.open({ map, anchor: marker }));
            }
            bounds.extend({ lat: m.lat, lng: m.lon });
          });

          polygons.forEach((p) => {
            if (p.path.length < 3) return;
            const color = p.color ?? "#10b981";
            const poly = new g.maps.Polygon({
              map,
              paths: p.path.map((pt) => ({ lat: pt.lat, lng: pt.lon })),
              strokeColor: color, strokeWeight: 2, fillColor: color, fillOpacity: 0.15,
            });
            poly.getPath().forEach((ll: any) => bounds.extend(ll));
          });

          if (hasAnyFeature && !bounds.isEmpty()) map.fitBounds(bounds, 40);
          apiRef.current = { g, map, kind: "google" as const };
          setProvider("google");
        } catch (e: any) {
          setError(e?.message ?? "Google Maps failed — using OpenStreetMap");
          void initLeaflet();
        }
      };

      const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        googleKey!
      )}&loading=async&callback=${cb}`;
      if ((window as any).google?.maps) { (window as any)[cb](); return; }
      const s = document.createElement("script");
      s.src = src; s.async = true; s.defer = true; s.dataset.novaGmaps = "1";
      s.onerror = () => {
        setError("Google Maps script blocked — using OpenStreetMap");
        void initLeaflet();
      };
      document.head.appendChild(s);
    }

    if (googleKey) initGoogle();
    else void initLeaflet();

    return () => {
      cancelled = true;
      const api = apiRef.current;
      if (api?.kind === "osm" && api.map) { try { api.map.remove(); } catch { /* noop */ } }
      apiRef.current = null;
      userMarkerRef.current = null;
      weatherLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, routes.length, markers.length, polygons.length]);

  // ---- Weather layer toggle ----
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    if (!weatherOn) {
      if (weatherLayerRef.current) {
        if (api.kind === "osm") api.map.removeLayer(weatherLayerRef.current);
        else weatherLayerRef.current.setMap(null);
        weatherLayerRef.current = null;
      }
      return;
    }
    const tileUrl = owmKey
      ? `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmKey}`
      : null;
    if (!tileUrl) {
      setError("Weather layer requires VITE_OPENWEATHER_API_KEY");
      setWeatherOn(false);
      return;
    }
    if (api.kind === "osm") {
      const layer = api.L.tileLayer(tileUrl, { opacity: 0.6, attribution: "© OpenWeatherMap" });
      layer.addTo(api.map);
      weatherLayerRef.current = layer;
    } else {
      const layer = new api.g.maps.ImageMapType({
        getTileUrl: (coord: { x: number; y: number }, z: number) =>
          tileUrl.replace("{z}", String(z)).replace("{x}", String(coord.x)).replace("{y}", String(coord.y)),
        tileSize: new api.g.maps.Size(256, 256),
        opacity: 0.6, name: "precipitation",
      });
      api.map.overlayMapTypes.push(layer);
      weatherLayerRef.current = layer;
    }
  }, [weatherOn, owmKey, provider]);

  // ---- Geolocation ----
  const locate = useCallback(async () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported by this browser");
      return;
    }
    // Best-effort permission pre-check
    try {
      if ("permissions" in navigator) {
        const status = await (navigator as any).permissions.query({ name: "geolocation" });
        if (status.state === "denied") {
          setError("Location permission denied. Enable it in your browser settings.");
          return;
        }
      }
    } catch { /* Safari etc — proceed */ }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lon } = pos.coords;
        const api = apiRef.current;
        if (!api) return;
        if (api.kind === "osm") {
          const { L, map } = api;
          if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
          userMarkerRef.current = L.circleMarker([lat, lon], {
            radius: 8, color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.6,
          }).addTo(map).bindPopup("You are here").openPopup();
          map.setView([lat, lon], 8);
        } else {
          const { g, map } = api;
          if (userMarkerRef.current) userMarkerRef.current.setMap(null);
          userMarkerRef.current = new g.maps.Marker({
            map, position: { lat, lng: lon }, title: "You are here",
          });
          map.setCenter({ lat, lng: lon });
          map.setZoom(8);
        }
      },
      (err) => { setLocating(false); setError(humanGeoError(err)); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapIcon className="h-3.5 w-3.5" />
          <span>
            {provider === "loading" && "Loading map…"}
            {provider === "google" && "Google Maps"}
            {provider === "osm" && (googleKey ? "OpenStreetMap (fallback)" : "OpenStreetMap")}
            {provider === "error" && "Map unavailable"}
          </span>
          {resolvedRoutes.length > 0 && (
            <span className="hidden sm:inline text-[10px] opacity-70">
              · {resolvedRoutes.length} route{resolvedRoutes.length > 1 ? "s" : ""} · {fmtKm(resolvedRoutes.reduce((s, r) => s + r.km, 0))} total
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {enableWeatherLayer && (
            <Button
              variant={weatherOn ? "default" : "outline"}
              size="sm"
              onClick={() => setWeatherOn((v) => !v)}
              className="gap-1.5 h-7 text-xs"
              title={owmKey ? "Toggle precipitation layer" : "Requires VITE_OPENWEATHER_API_KEY"}
            >
              <CloudRain className="h-3.5 w-3.5" /> Weather
            </Button>
          )}
          {enableLocate && (
            <Button variant="outline" size="sm" onClick={locate} disabled={locating}
              className="gap-1.5 h-7 text-xs">
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
              My location
            </Button>
          )}
        </div>
      </div>
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height, minHeight: 240 }}
          className={cn("w-full rounded-lg overflow-hidden border bg-muted/30 relative", provider === "loading" && "animate-pulse")}
        />
        {provider === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <div className="text-xs text-muted-foreground">{error ?? "Map failed to load"}</div>
            <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}
      </div>
      {error && provider !== "error" && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
