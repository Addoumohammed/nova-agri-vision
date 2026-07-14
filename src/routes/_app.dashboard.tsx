import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Ship,
  Globe2,
  Sparkles,
  DollarSign,
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Bell,
  Plus,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Package,
  Truck,
  BarChart3,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const tradeData = [
  { m: "Jan", exports: 1.2, imports: 0.8 },
  { m: "Feb", exports: 1.4, imports: 0.9 },
  { m: "Mar", exports: 1.35, imports: 1.0 },
  { m: "Apr", exports: 1.6, imports: 1.1 },
  { m: "May", exports: 1.85, imports: 1.2 },
  { m: "Jun", exports: 2.05, imports: 1.15 },
  { m: "Jul", exports: 2.0, imports: 1.3 },
  { m: "Aug", exports: 2.2, imports: 1.4 },
  { m: "Sep", exports: 2.35, imports: 1.55 },
  { m: "Oct", exports: 2.55, imports: 1.6 },
  { m: "Nov", exports: 2.7, imports: 1.75 },
  { m: "Dec", exports: 2.95, imports: 1.9 },
];

const marketTrends = [
  { d: "W1", wheat: 245, corn: 178, rice: 412 },
  { d: "W2", wheat: 252, corn: 182, rice: 418 },
  { d: "W3", wheat: 248, corn: 189, rice: 425 },
  { d: "W4", wheat: 261, corn: 195, rice: 430 },
  { d: "W5", wheat: 274, corn: 201, rice: 428 },
  { d: "W6", wheat: 282, corn: 208, rice: 441 },
  { d: "W7", wheat: 291, corn: 214, rice: 452 },
];

const topCountries = [
  { c: "Netherlands", flag: "🇳🇱", vol: 428, pct: 92 },
  { c: "Germany", flag: "🇩🇪", vol: 386, pct: 83 },
  { c: "UAE", flag: "🇦🇪", vol: 342, pct: 74 },
  { c: "Italy", flag: "🇮🇹", vol: 298, pct: 64 },
  { c: "Saudi Arabia", flag: "🇸🇦", vol: 264, pct: 57 },
];

const topProducts = [
  { p: "Oranges", origin: "Egypt", vol: "12,400 T", trend: 8.4, up: true },
  { p: "Wheat", origin: "Ukraine", vol: "9,820 T", trend: 4.2, up: true },
  { p: "Potatoes", origin: "Egypt", vol: "8,650 T", trend: -1.8, up: false },
  { p: "Mangoes", origin: "India", vol: "6,120 T", trend: 12.6, up: true },
  { p: "Coffee", origin: "Brazil", vol: "5,940 T", trend: 3.1, up: true },
];

function DashboardPage() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const kpis = [
    { label: t("dash.kpi.revenue"), value: "$2.94B", delta: "+12.4%", up: true, icon: DollarSign, tint: "from-emerald-500/20 to-transparent" },
    { label: t("dash.kpi.orders"), value: "1,284", delta: "+3.2%", up: true, icon: Ship, tint: "from-blue-500/20 to-transparent" },
    { label: t("dash.kpi.partners"), value: "612", delta: "+8", up: true, icon: Globe2, tint: "from-violet-500/20 to-transparent" },
    { label: t("dash.kpi.ai"), value: "48", delta: "today", up: true, icon: Sparkles, tint: "from-amber-500/20 to-transparent" },
  ];

  const notifications = [
    { icon: AlertTriangle, tone: "text-warning", title: "Wind advisory · Nile Delta", time: "12m" },
    { icon: CheckCircle2, tone: "text-emerald-500", title: "Shipment NP-2841 cleared customs", time: "1h" },
    { icon: TrendingUp, tone: "text-primary", title: "Orange prices +6.2% in EU", time: "2h" },
    { icon: Bell, tone: "text-blue-500", title: "New buyer request · Dubai (40T mangoes)", time: "3h" },
  ];

  const activities = [
    { t: "Shipment NP-2841 departed Alexandria", s: "Rotterdam · 2m ago", dot: "bg-primary" },
    { t: "Nova AI insight: hedge wheat 30d", s: "AI engine · 42m ago", dot: "bg-amber-500" },
    { t: "Invoice INV-5521 paid", s: "€184,000 · 1h ago", dot: "bg-emerald-500" },
    { t: "New buyer verified · Carrefour FR", s: "Compliance · 3h ago", dot: "bg-blue-500" },
    { t: "Weather alert issued · Upper Egypt", s: "Meteo · 5h ago", dot: "bg-warning" },
  ];

  const recommendations = [
    { title: "Prioritize Rotterdam route this week", body: "Freight prices dropped 4.1%. Margin uplift +8.4% on citrus.", tag: "High impact" },
    { title: "Hedge wheat exposure for 30 days", body: "Volatility index climbing; secure forward at $274/T.", tag: "Risk" },
    { title: "Onboard 3 new EU buyers", body: "Match score >92% for your organic potato profile.", tag: "Growth" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">{t("dash.welcome")}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t("dash.overview")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground grid place-items-center">
              4
            </span>
          </Button>
          <Button className="bg-gradient-primary shadow-glow gap-2 hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> New shipment
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Plus, label: "New shipment", to: "/export" },
          { icon: Sparkles, label: "Ask Nova AI", to: "/nova-ai" },
          { icon: BarChart3, label: "View market", to: "/market" },
          { icon: FileText, label: "Reports", to: "/dashboard" },
        ].map((q, i) => (
          <Link
            key={q.label}
            to={q.to}
            className="group rounded-2xl border border-border bg-card p-4 shadow-elegant hover:border-primary/50 hover:shadow-glow transition-all animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shrink-0 group-hover:scale-110 transition-transform">
                <q.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{q.label}</div>
                <div className="text-[11px] text-muted-foreground">Quick action</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-glow ${
              mounted ? "animate-fade-in" : "opacity-0"
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${k.tint} pointer-events-none`} />
            <div className="relative flex items-center justify-between">
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
            <div className="relative mt-4 text-2xl sm:text-3xl font-display font-bold">{k.value}</div>
            <div className="relative text-sm text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Trade chart + Nova AI recs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-lg">Exports vs Imports</h3>
              <p className="text-xs text-muted-foreground">Last 12 months · USD (Billions)</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Exports</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Imports</span>
            </div>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tradeData}>
                <defs>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.15 75)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.78 0.15 75)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="m" stroke="currentColor" fontSize={11} className="text-muted-foreground" />
                <YAxis stroke="currentColor" fontSize={11} className="text-muted-foreground" tickFormatter={(v) => `$${v}B`} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                  formatter={(v: number, n) => [`$${v}B`, n === "exports" ? "Exports" : "Imports"]}
                />
                <Area type="monotone" dataKey="exports" stroke="oklch(0.62 0.16 155)" strokeWidth={2} fill="url(#gExp)" />
                <Area type="monotone" dataKey="imports" stroke="oklch(0.78 0.15 75)" strokeWidth={2} fill="url(#gImp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nova AI Recommendations */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant relative overflow-hidden">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Nova AI</h3>
                <p className="text-[11px] text-muted-foreground">Recommendations for you</p>
              </div>
            </div>
            <Link to="/nova-ai" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
              Open <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="relative space-y-3">
            {recommendations.map((r) => (
              <li key={r.title} className="rounded-xl border border-border bg-background/60 p-3 hover:border-primary/50 transition">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-sm font-semibold truncate">{r.title}</div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">{r.tag}</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Market trends + Weather */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">Market trends</h3>
              <p className="text-xs text-muted-foreground">Weekly · USD per ton</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Wheat</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Corn</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Rice</span>
            </div>
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="d" stroke="currentColor" fontSize={11} className="text-muted-foreground" />
                <YAxis stroke="currentColor" fontSize={11} className="text-muted-foreground" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="wheat" stroke="oklch(0.62 0.16 155)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="corn" stroke="oklch(0.78 0.15 75)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rice" stroke="oklch(0.65 0.18 250)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather widget */}
        <Link
          to="/weather"
          className="rounded-2xl border border-border bg-gradient-primary text-primary-foreground p-6 shadow-elegant relative overflow-hidden group"
        >
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl group-hover:scale-110 transition-transform" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="text-xs opacity-80">Cairo · Nile Delta</div>
              <div className="mt-2 text-5xl font-display font-bold">28°</div>
              <div className="text-sm opacity-90">Partly cloudy</div>
            </div>
            <Sun className="h-14 w-14 opacity-90" />
          </div>
          <div className="relative mt-6 grid grid-cols-3 gap-2">
            {[
              { icon: Droplets, l: "Humidity", v: "62%" },
              { icon: Wind, l: "Wind", v: "18" },
              { icon: CloudRain, l: "Rain", v: "12%" },
            ].map((m) => (
              <div key={m.l} className="rounded-lg bg-white/10 backdrop-blur p-2">
                <m.icon className="h-4 w-4 opacity-90" />
                <div className="mt-1 text-[10px] opacity-80">{m.l}</div>
                <div className="text-sm font-semibold">{m.v}</div>
              </div>
            ))}
          </div>
          <div className="relative mt-5 flex items-center gap-2 text-xs bg-white/10 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Wind advisory · Nile Delta</span>
          </div>
        </Link>
      </div>

      {/* Top countries + Top products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">Top exporting destinations</h3>
              <p className="text-xs text-muted-foreground">Volume in $M · last 30 days</p>
            </div>
            <Globe2 className="h-5 w-5 text-primary" />
          </div>
          <ul className="space-y-3">
            {topCountries.map((c) => (
              <li key={c.c}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{c.flag}</span>
                    <span className="font-medium truncate">{c.c}</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">${c.vol}M</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary transition-all duration-1000"
                    style={{ width: mounted ? `${c.pct}%` : "0%" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">Top imported products</h3>
              <p className="text-xs text-muted-foreground">Global agricultural imports</p>
            </div>
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <ul className="divide-y divide-border">
            {topProducts.map((p) => (
              <li key={p.p} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-accent grid place-items-center shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.p}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{p.origin} · {p.vol}</div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                    p.up ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {p.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {p.up ? "+" : ""}{p.trend}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Notifications + Activity timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">Smart notifications</h3>
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.title} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/40 transition">
                <div className={`h-8 w-8 rounded-lg bg-accent grid place-items-center shrink-0 ${n.tone}`}>
                  <n.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground">{n.time} ago</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">{t("dash.activity")}</h3>
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <ol className="relative border-s border-border ms-2 space-y-4">
            {activities.map((a) => (
              <li key={a.t} className="ms-4">
                <span className={`absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full ${a.dot} ring-4 ring-card`} />
                <div className="text-sm font-medium">{a.t}</div>
                <div className="text-xs text-muted-foreground">{a.s}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Live shipments pipeline */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">{t("dash.pipeline")}</h3>
          <Link to="/export" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { id: "NP-2841", from: "Alexandria", to: "Rotterdam", pct: 78, prod: "Oranges · 24T" },
            { id: "NP-2843", from: "Damietta", to: "Genoa", pct: 42, prod: "Potatoes · 40T" },
            { id: "NP-2845", from: "Port Said", to: "Jebel Ali", pct: 15, prod: "Mangoes · 12T" },
          ].map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold inline-flex items-center gap-1.5">
                  <Ship className="h-3.5 w-3.5 text-primary" />
                  {s.id}
                </span>
                <span className="text-xs text-muted-foreground">{s.prod}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {s.from} → {s.to}
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all duration-1000"
                  style={{ width: mounted ? `${s.pct}%` : "0%" }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground text-end">{s.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
