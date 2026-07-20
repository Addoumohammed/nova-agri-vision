import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cloud,
  CloudRain,
  Droplets,
  Sun,
  Wind,
  AlertTriangle,
  Sprout,
  Ship,
  Thermometer,
  Sunrise,
  Sunset,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getWeather } from "@/lib/public-apis.functions";

export const Route = createFileRoute("/_app/weather")({
  component: WeatherPage,
});

type LiveCurrent = {
  temp?: number;
  feels_like?: number;
  humidity?: number;
  wind?: number;
  desc?: string;
  city?: string;
  sunrise?: number;
  sunset?: number;
};

const forecast = [
  { d: "Mon", t: 27, low: 18, i: Sun, r: 0 },
  { d: "Tue", t: 29, low: 19, i: Sun, r: 0 },
  { d: "Wed", t: 26, low: 18, i: Cloud, r: 10 },
  { d: "Thu", t: 24, low: 17, i: CloudRain, r: 40 },
  { d: "Fri", t: 25, low: 17, i: CloudRain, r: 60 },
  { d: "Sat", t: 27, low: 18, i: Cloud, r: 15 },
  { d: "Sun", t: 30, low: 20, i: Sun, r: 0 },
];

const tempHourly = Array.from({ length: 24 }, (_, i) => ({
  h: `${i}h`,
  t: 20 + Math.sin((i - 6) / 4) * 8 + Math.random(),
}));

const regions = [
  { r: "Nile Delta", risk: "High wind", level: "warning" },
  { r: "Upper Egypt", risk: "Heat wave", level: "warning" },
  { r: "Sinai", risk: "Clear", level: "ok" },
  { r: "Alexandria coast", risk: "Rain 40%", level: "ok" },
];

const farming = [
  { c: "Delay orange harvest 24h", d: "Thu-Fri wind gusts up to 42 km/h — protect fruit quality.", tone: "warning" },
  { c: "Ideal for potato irrigation", d: "Soil moisture will drop 8% by Wed. Schedule Tuesday morning.", tone: "ok" },
  { c: "Wheat spray window opens", d: "Mon-Tue calm winds, low rain probability — ideal fungicide application.", tone: "ok" },
];

const exportAlerts = [
  { r: "Alexandria → Rotterdam", d: "Rough seas Thu-Fri, expect +18h transit.", tone: "warning" },
  { r: "Damietta → Genoa", d: "Clear corridor — on-time performance 98%.", tone: "ok" },
  { r: "Jebel Ali arrivals", d: "Dust storm advisory Sat.", tone: "warning" },
];

function WeatherPage() {
  const { t } = useI18n();
  const [live, setLive] = useState<LiveCurrent | null>(null);
  const [source, setSource] = useState<"live" | "demo">("demo");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Cairo coordinates by default
        const res = await getWeather({ data: { lat: 30.0444, lon: 31.2357, units: "metric" } });
        if (!cancelled && res && (res as any).ok) {
          setLive((res as any).data.current as LiveCurrent);
          setSource("live");
        }
      } catch {
        /* keep demo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const temp = live?.temp != null ? Math.round(live.temp) : 28;
  const feels = live?.feels_like != null ? Math.round(live.feels_like) : 30;
  const humidity = live?.humidity != null ? `${live.humidity}%` : "62%";
  const wind = live?.wind != null ? `${Math.round(live.wind * 3.6)} km/h` : "18 km/h";
  const desc = live?.desc ?? "Partly cloudy";
  const cityLabel = live?.city ? `${live.city} · Nile Delta` : "Cairo · Nile Delta";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">{t("weather.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("weather.sub")}</p>
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full",
            source === "live" ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground",
          )}
        >
          {source === "live" ? "Live · OpenWeather" : "Demo data"}
        </span>
      </div>

      {/* Current + risk */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-gradient-primary text-primary-foreground p-6 sm:p-8 shadow-elegant relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 relative">
            <div className="min-w-0">
              <div className="text-sm opacity-80">{cityLabel}</div>
              <div className="mt-2 text-6xl sm:text-7xl font-display font-bold">{temp}°</div>
              <div className="opacity-80 capitalize">{desc} · {t("weather.now")}</div>
              <div className="mt-1 text-xs opacity-70">Feels like {feels}° · UV 6 (High)</div>
            </div>
            <Sun className="h-16 w-16 sm:h-20 sm:w-20 opacity-90 shrink-0" />
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
            {[
              { icon: Droplets, l: t("weather.humidity"), v: humidity },
              { icon: Wind, l: t("weather.wind"), v: wind },
              { icon: CloudRain, l: t("weather.rain"), v: "12%" },
              { icon: Thermometer, l: "Pressure", v: "1014 hPa" },
            ].map((m) => (
              <div key={m.l} className="rounded-xl bg-white/10 backdrop-blur p-3 sm:p-4">
                <m.icon className="h-4 w-4 sm:h-5 sm:w-5 opacity-90" />
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs opacity-80">{m.l}</div>
                <div className="text-sm sm:text-lg font-semibold">{m.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 relative flex flex-wrap gap-4 text-xs opacity-90">
            <span className="inline-flex items-center gap-1">
              <Sunrise className="h-3 w-3" />{" "}
              {live?.sunrise ? new Date(live.sunrise * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "06:14"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Sunset className="h-3 w-3" />{" "}
              {live?.sunset ? new Date(live.sunset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "17:48"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg">{t("weather.risk")}</h3>
          <ul className="mt-4 space-y-3">
            {regions.map((r) => (
              <li key={r.r} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <span className="text-sm font-medium">{r.r}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-semibold",
                    r.level === "warning" ? "text-warning" : "text-emerald-500",
                  )}
                >
                  {r.level === "warning" && <AlertTriangle className="h-3 w-3" />}
                  {r.risk}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Temp chart + rain chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg">Temperature · 24h</h3>
          <p className="text-xs text-muted-foreground">Hourly, Cairo</p>
          <div className="h-56 mt-4">
            <ResponsiveContainer>
              <AreaChart data={tempHourly}>
                <defs>
                  <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.75 0.16 60)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.75 0.16 60)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="h" fontSize={10} tickLine={false} axisLine={false} interval={3} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} unit="°" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="t" stroke="oklch(0.75 0.16 60)" fill="url(#gt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg">Rain probability · 7 days</h3>
          <p className="text-xs text-muted-foreground">Percent chance</p>
          <div className="h-56 mt-4">
            <ResponsiveContainer>
              <BarChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="d" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="r" fill="oklch(0.7 0.18 250)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 7-day forecast */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <h3 className="font-display font-semibold text-lg mb-4">{t("weather.forecast")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {forecast.map((f) => (
            <div key={f.d} className="rounded-xl border border-border bg-background p-4 text-center hover-scale transition">
              <div className="text-xs text-muted-foreground">{f.d}</div>
              <f.i className="h-8 w-8 mx-auto my-3 text-primary" />
              <div className="text-lg font-display font-bold">{f.t}°</div>
              <div className="text-xs text-muted-foreground">{f.low}° low</div>
              <div className="text-xs text-blue-500 mt-1">{f.r}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Farming + export alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg mb-4 inline-flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-500" /> Farming recommendations
          </h3>
          <ul className="space-y-3">
            {farming.map((f) => (
              <li key={f.c} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      f.tone === "warning" ? "bg-warning" : "bg-emerald-500",
                    )}
                  />
                  <div className="font-semibold text-sm">{f.c}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ps-4">{f.d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg mb-4 inline-flex items-center gap-2">
            <Ship className="h-4 w-4 text-primary" /> Export weather alerts
          </h3>
          <ul className="space-y-3">
            {exportAlerts.map((a) => (
              <li key={a.r} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{a.r}</div>
                  <span
                    className={cn(
                      "text-xs font-semibold inline-flex items-center gap-1",
                      a.tone === "warning" ? "text-warning" : "text-emerald-500",
                    )}
                  >
                    {a.tone === "warning" && <AlertTriangle className="h-3 w-3" />}
                    {a.tone === "warning" ? "Advisory" : "Clear"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{a.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
