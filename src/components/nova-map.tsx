import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LocateFixed, Map as MapIcon, AlertCircle } from "lucide-react";
import { lookupCoords, type LatLon } from "@/lib/geo-coords";

export type MapRoute = {
  id: string;
  label?: string;
  origin: string;   // "Alexandria, EG"
  destination: string;
  color?: string;
};

type Props = {
  routes: MapRoute[];
  height?: number;
  className?: string;
};

/**
 * NovaMap — production map widget.
 * - Uses Google Maps JS API when a browser key is present
 *   (VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY or VITE_GOOGLE_MAPS_BROWSER_KEY).
 * - Falls back to Leaflet + OpenStreetMap tiles (keyless) automatically.
 * - Renders origin/destination markers, a route polyline, and a "locate me" control.
 * - Client-only: relies on window/navigator; must be rendered behind <ClientOnly>.
 */
export default function NovaMap({ routes, height = 360, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [provider, setProvider] = useState<"google" | "osm" | "loading" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<any>(null); // holds map / leaflet instance
  const userMarkerRef = useRef<any>(null);

  const googleKey =
    (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined);

  const points: Array<{ route: MapRoute; from: LatLon; to: LatLon }> = routes
    .map((r) => {
      const from = lookupCoords(r.origin);
      const to = lookupCoords(r.destination);
      return from && to ? { route: r, from, to } : null;
    })
    .filter((x): x is { route: MapRoute; from: LatLon; to: LatLon } => x !== null);

  // ---- Initialise map ----
  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;

    async function initLeaflet() {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !node) return;

        const map = L.map(node, { zoomControl: true, attributionControl: true }).setView([20, 10], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(map);

        const bounds = L.latLngBounds([]);
        points.forEach(({ route, from, to }) => {
          const color = route.color ?? "#10b981";
          const originIcon = L.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>`,
          });
          const destIcon = L.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;border-radius:2px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>`,
          });
          L.marker([from.lat, from.lon], { icon: originIcon })
            .addTo(map)
            .bindPopup(`<b>${route.label ?? route.id}</b><br/>Origin: ${route.origin}`);
          L.marker([to.lat, to.lon], { icon: destIcon })
            .addTo(map)
            .bindPopup(`<b>${route.label ?? route.id}</b><br/>Destination: ${route.destination}`);
          L.polyline(
            [
              [from.lat, from.lon],
              [to.lat, to.lon],
            ],
            { color, weight: 2, opacity: 0.75, dashArray: "6 6" }
          ).addTo(map);
          bounds.extend([from.lat, from.lon]).extend([to.lat, to.lon]);
        });
        if (points.length && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }

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
          points.forEach(({ route, from, to }) => {
            const color = route.color ?? "#10b981";
            new g.maps.Marker({
              map,
              position: { lat: from.lat, lng: from.lon },
              title: `${route.label ?? route.id} — ${route.origin}`,
            });
            new g.maps.Marker({
              map,
              position: { lat: to.lat, lng: to.lon },
              title: `${route.label ?? route.id} — ${route.destination}`,
              icon: {
                path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 4,
                strokeColor: color,
              },
            });
            new g.maps.Polyline({
              map,
              path: [
                { lat: from.lat, lng: from.lon },
                { lat: to.lat, lng: to.lon },
              ],
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 2,
              geodesic: true,
            });
            bounds.extend({ lat: from.lat, lng: from.lon });
            bounds.extend({ lat: to.lat, lng: to.lon });
          });
          if (points.length) map.fitBounds(bounds, 40);
          apiRef.current = { g, map, kind: "google" as const };
          setProvider("google");
        } catch (e: any) {
          setError(e?.message ?? "Google Maps failed");
          void initLeaflet();
        }
      };

      const existing = document.querySelector(`script[data-nova-gmaps]`) as HTMLScriptElement | null;
      const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        googleKey!
      )}&loading=async&callback=${cb}`;
      if (existing && (window as any).google?.maps) {
        (window as any)[cb]();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.defer = true;
      s.dataset.novaGmaps = "1";
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
      if (api?.kind === "osm" && api.map) {
        try { api.map.remove(); } catch { /* noop */ }
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes.length]);

  // ---- User location ----
  function locate() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const api = apiRef.current;
        if (!api) return;
        if (api.kind === "osm") {
          const { L, map } = api;
          if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
          userMarkerRef.current = L.circleMarker([lat, lon], {
            radius: 8,
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.6,
          }).addTo(map).bindPopup("You are here");
          map.setView([lat, lon], 6);
        } else {
          const { g, map } = api;
          if (userMarkerRef.current) userMarkerRef.current.setMap(null);
          userMarkerRef.current = new g.maps.Marker({
            map,
            position: { lat, lng: lon },
            title: "You are here",
          });
          map.setCenter({ lat, lng: lon });
          map.setZoom(6);
        }
      },
      (err) => setError(err.message || "Unable to get your location"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }

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
          {!googleKey && provider === "osm" && (
            <span className="hidden sm:inline text-[10px] opacity-70">
              · Add VITE_GOOGLE_MAPS_BROWSER_KEY for Google Maps
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={locate} className="gap-1.5 h-7 text-xs">
          <LocateFixed className="h-3.5 w-3.5" /> My location
        </Button>
      </div>
      <div
        ref={containerRef}
        style={{ height, minHeight: 240 }}
        className="w-full rounded-lg overflow-hidden border bg-muted/30 relative"
      />
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
