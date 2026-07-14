import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ArrowDownRight, Ship, Globe2, Sparkles, DollarSign } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const chartData = [
  { m: "Jan", v: 1.2 }, { m: "Feb", v: 1.4 }, { m: "Mar", v: 1.35 },
  { m: "Apr", v: 1.6 }, { m: "May", v: 1.85 }, { m: "Jun", v: 2.05 },
  { m: "Jul", v: 2.0 }, { m: "Aug", v: 2.2 }, { m: "Sep", v: 2.35 },
  { m: "Oct", v: 2.55 }, { m: "Nov", v: 2.7 }, { m: "Dec", v: 2.95 },
];

function DashboardPage() {
  const { t } = useI18n();

  const kpis = [
    { label: t("dash.kpi.revenue"), value: "$2.94B", delta: "+12.4%", up: true, icon: DollarSign },
    { label: t("dash.kpi.orders"), value: "1,284", delta: "+3.2%", up: true, icon: Ship },
    { label: t("dash.kpi.partners"), value: "612", delta: "+8", up: true, icon: Globe2 },
    { label: t("dash.kpi.ai"), value: "48", delta: "today", up: true, icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">{t("dash.welcome")}</h1>
        <p className="text-muted-foreground mt-1">{t("dash.overview")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-accent grid place-items-center">
                <k.icon className="h-5 w-5 text-primary" />
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  k.up ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {k.delta}
              </span>
            </div>
            <div className="mt-4 text-3xl font-display font-bold">{k.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">{t("dash.chart.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("dash.chart.sub")}</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="m" stroke="currentColor" fontSize={12} className="text-muted-foreground" />
                <YAxis stroke="currentColor" fontSize={12} className="text-muted-foreground" tickFormatter={(v) => `$${v}B`} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => [`$${v}B`, "Volume"]}
                />
                <Area type="monotone" dataKey="v" stroke="oklch(0.62 0.16 155)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg">{t("dash.activity")}</h3>
          <ul className="mt-4 space-y-4">
            {[
              { t: "Shipment #NP-2841 cleared customs", s: "Rotterdam · 2m ago" },
              { t: "New buyer request: 40T mangoes", s: "Dubai · 18m ago" },
              { t: "AI insight: hedge wheat 30d", s: "Nova AI · 1h ago" },
              { t: "Weather alert: Nile Delta wind", s: "Weather · 3h ago" },
              { t: "Invoice #INV-5521 paid", s: "€184,000 · 5h ago" },
            ].map((a) => (
              <li key={a.t} className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.s}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <h3 className="font-display font-semibold text-lg mb-4">{t("dash.pipeline")}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { id: "NP-2841", from: "Alexandria", to: "Rotterdam", pct: 78, prod: "Oranges · 24T" },
            { id: "NP-2843", from: "Damietta", to: "Genoa", pct: 42, prod: "Potatoes · 40T" },
            { id: "NP-2845", from: "Port Said", to: "Jebel Ali", pct: 15, prod: "Mangoes · 12T" },
          ].map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{s.id}</span>
                <span className="text-xs text-muted-foreground">{s.prod}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {s.from} → {s.to}
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-primary" style={{ width: `${s.pct}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground text-end">{s.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
