import { createFileRoute } from "@tanstack/react-router";
import { Cloud, CloudRain, Droplets, Sun, Wind, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/weather")({
  component: WeatherPage,
});

const forecast = [
  { d: "Mon", t: 27, i: Sun, r: 0 },
  { d: "Tue", t: 29, i: Sun, r: 0 },
  { d: "Wed", t: 26, i: Cloud, r: 10 },
  { d: "Thu", t: 24, i: CloudRain, r: 40 },
  { d: "Fri", t: 25, i: CloudRain, r: 60 },
  { d: "Sat", t: 27, i: Cloud, r: 15 },
  { d: "Sun", t: 30, i: Sun, r: 0 },
];

const regions = [
  { r: "Nile Delta", risk: "High wind", level: "warning" },
  { r: "Upper Egypt", risk: "Heat wave", level: "warning" },
  { r: "Sinai", risk: "Clear", level: "ok" },
  { r: "Alexandria coast", risk: "Rain 40%", level: "ok" },
];

function WeatherPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">{t("weather.title")}</h1>
        <p className="text-muted-foreground">{t("weather.sub")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-gradient-primary text-primary-foreground p-8 shadow-elegant relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-start justify-between relative">
            <div>
              <div className="text-sm opacity-80">Cairo · Nile Delta</div>
              <div className="mt-2 text-7xl font-display font-bold">28°</div>
              <div className="opacity-80">Partly cloudy · {t("weather.now")}</div>
            </div>
            <Sun className="h-20 w-20 opacity-90" />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 relative">
            {[
              { icon: Droplets, l: t("weather.humidity"), v: "62%" },
              { icon: Wind, l: t("weather.wind"), v: "18 km/h" },
              { icon: CloudRain, l: t("weather.rain"), v: "12%" },
            ].map((m) => (
              <div key={m.l} className="rounded-xl bg-white/10 backdrop-blur p-4">
                <m.icon className="h-5 w-5 opacity-90" />
                <div className="mt-2 text-xs opacity-80">{m.l}</div>
                <div className="text-lg font-semibold">{m.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg">{t("weather.risk")}</h3>
          <ul className="mt-4 space-y-3">
            {regions.map((r) => (
              <li key={r.r} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <span className="text-sm font-medium">{r.r}</span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    r.level === "warning" ? "text-warning" : "text-emerald-500"
                  }`}
                >
                  {r.level === "warning" && <AlertTriangle className="h-3 w-3" />}
                  {r.risk}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <h3 className="font-display font-semibold text-lg mb-4">{t("weather.forecast")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {forecast.map((f) => (
            <div key={f.d} className="rounded-xl border border-border bg-background p-4 text-center">
              <div className="text-xs text-muted-foreground">{f.d}</div>
              <f.i className="h-8 w-8 mx-auto my-3 text-primary" />
              <div className="text-lg font-display font-bold">{f.t}°</div>
              <div className="text-xs text-muted-foreground mt-1">{f.r}% rain</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
