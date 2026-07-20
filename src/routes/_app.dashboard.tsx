import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, ArrowDownRight, Ship, Sparkles, DollarSign, Cloud, CloudRain, Sun,
  Bell, Plus, FileText, TrendingUp, AlertTriangle, CheckCircle2, Package, BarChart3,
  ChevronRight, Search as SearchIcon, Command, Users, Building2, FileQuestion,
  CalendarDays, ClipboardCheck, ListTodo, Send, Info, Shield, ScrollText, Circle,
  Activity, Wallet, ArrowRight, Star, Globe2,
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
  LineChart, Line, ComposedChart, Area, RadialBarChart, RadialBar, Legend,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  shipments, orders, suppliers, buyers, topCountries, monthlyTrade, currency,
} from "@/lib/demo-data";
import {
  revenueSeries, commodities as seedCommodities, smartNotifications, pendingApprovals,
  initialTasks, weatherCities, marketTrendSeries, inventoryByCategory, activityTimeline,
  aiPrompts, type Commodity,
} from "@/lib/dashboard-data";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

// ------- helpers -------

function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

// ------- page -------

function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const totalRevenue = useCountUp(8_120_000);
  const netProfit = useCountUp(1_940_000);
  const activeShipments = useCountUp(shipments.filter((s) => s.status !== "delivered").length);
  const openOrders = useCountUp(orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length);

  return (
    <div className="space-y-6">
      {/* ===== Command Bar ===== */}
      <CommandBar onOpenPalette={() => setCmdOpen(true)} />

      {/* ===== Header ===== */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">{t("dash.welcome")}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t("dash.overview")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-emerald-500" /> Live · updated just now
        </div>
      </div>

      {/* ===== KPI Cards ===== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue (MTD)" value={fmtCompact(totalRevenue)} delta={12.4} icon={DollarSign} tint="emerald" />
        <Kpi label="Net Profit" value={fmtCompact(netProfit)} delta={8.6} icon={Wallet} tint="amber" />
        <Kpi label="Active Shipments" value={Math.round(activeShipments).toString()} delta={3.2} icon={Ship} tint="blue" />
        <Kpi label="Open Orders" value={Math.round(openOrders).toString()} delta={-1.4} icon={Package} tint="violet" />
      </div>

      {/* ===== Revenue + AI Copilot ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueProfitChart />
        <AiQuickPanel onSubmit={(p) => navigate({ to: "/nova-ai", search: { prompt: p } as never })} />
      </div>

      {/* ===== Trade performance + Commodity ticker ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <TradePerformance />
        <CommodityTicker />
      </div>

      {/* ===== Shipments + Weather ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ActiveShipmentsWidget />
        <WeatherSummary />
      </div>

      {/* ===== Orders + Calendar ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RecentOrdersWidget />
        <MiniCalendar />
      </div>

      {/* ===== Approvals + Tasks ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ApprovalsWidget />
        <TasksWidget />
      </div>

      {/* ===== Top partners + Countries ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <TopPartners kind="suppliers" />
        <TopPartners kind="buyers" />
        <CountryStats />
      </div>

      {/* ===== Market trends + Inventory ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <MarketTrendsWidget />
        <InventoryOverview />
      </div>

      {/* ===== Timeline ===== */}
      <ActivityTimelineWidget />

      {/* Command palette */}
      <SearchPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

// ============= KPI =============
function Kpi({
  label, value, delta, icon: Icon, tint,
}: { label: string; value: string; delta: number; icon: React.ComponentType<{ className?: string }>; tint: "emerald" | "amber" | "blue" | "violet" }) {
  const up = delta >= 0;
  const tintCls: Record<string, string> = {
    emerald: "from-emerald-500/25", amber: "from-amber-500/25", blue: "from-blue-500/25", violet: "from-violet-500/25",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-elegant hover:-translate-y-0.5 hover:shadow-glow transition-all">
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", tintCls[tint])} />
      <div className="relative flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-accent grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", up ? "text-emerald-500" : "text-rose-500")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta)}%
        </span>
      </div>
      <div className="relative mt-4 text-2xl sm:text-3xl font-display font-bold tabular-nums">{value}</div>
      <div className="relative text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ============= Command Bar =============
function CommandBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const navigate = useNavigate();
  const critical = smartNotifications.filter((n) => n.severity === "critical" || n.severity === "warning").length;

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
      <button
        onClick={onOpenPalette}
        className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left hover:border-primary/50 transition"
      >
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm text-muted-foreground truncate">Search orders, shipments, suppliers, insights…</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted">
          <Command className="h-3 w-3" /> K
        </kbd>
      </button>
      <NotificationsPopover badge={critical} />
      <QuickActionsMenu onNav={(to) => navigate({ to })} />
    </div>
  );
}

function NotificationsPopover({ badge }: { badge: number }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Alerts</span>
          {badge > 0 && (
            <span className="absolute -top-1.5 -end-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center">
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Smart notifications</div>
          <button className="text-xs text-primary hover:underline" onClick={() => toast.success("All notifications marked as read")}>
            Mark all read
          </button>
        </div>
        <ul className="max-h-96 overflow-y-auto divide-y divide-border">
          {smartNotifications.map((n) => (
            <li key={n.id} className="p-3 flex items-start gap-3 hover:bg-muted/50 transition">
              <span className={cn(
                "mt-0.5 h-8 w-8 rounded-lg grid place-items-center shrink-0",
                n.severity === "critical" && "bg-rose-500/15 text-rose-500",
                n.severity === "warning" && "bg-amber-500/15 text-amber-500",
                n.severity === "success" && "bg-emerald-500/15 text-emerald-500",
                n.severity === "info" && "bg-blue-500/15 text-blue-500",
              )}>
                {n.severity === "critical" || n.severity === "warning" ? <AlertTriangle className="h-4 w-4" />
                  : n.severity === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{n.title}</div>
                  <div className="text-[10px] text-muted-foreground shrink-0">{n.time}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function QuickActionsMenu({ onNav }: { onNav: (to: string) => void }) {
  const actions = [
    { icon: Plus, label: "New shipment", to: "/export" },
    { icon: FileQuestion, label: "New RFQ", to: "/rfq" },
    { icon: FileText, label: "New order", to: "/orders" },
    { icon: Users, label: "Invite supplier", to: "/suppliers" },
    { icon: Sparkles, label: "Ask Nova AI", to: "/nova-ai" },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="bg-gradient-primary shadow-glow gap-2">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Quick actions</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="grid gap-1">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => onNav(a.to)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted transition text-start"
            >
              <a.icon className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate">{a.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const go = (to: string) => { onOpenChange(false); navigate({ to }); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Workspaces">
          <CommandItem onSelect={() => go("/dashboard")}><BarChart3 className="me-2 h-4 w-4" /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/nova-ai")}><Sparkles className="me-2 h-4 w-4" /> Nova AI</CommandItem>
          <CommandItem onSelect={() => go("/market")}><TrendingUp className="me-2 h-4 w-4" /> Marketplace</CommandItem>
          <CommandItem onSelect={() => go("/analytics")}><BarChart3 className="me-2 h-4 w-4" /> Analytics</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Operations">
          <CommandItem onSelect={() => go("/orders")}><FileText className="me-2 h-4 w-4" /> Orders</CommandItem>
          <CommandItem onSelect={() => go("/invoices")}><FileText className="me-2 h-4 w-4" /> Invoices</CommandItem>
          <CommandItem onSelect={() => go("/export")}><Ship className="me-2 h-4 w-4" /> Shipments</CommandItem>
          <CommandItem onSelect={() => go("/rfq")}><FileQuestion className="me-2 h-4 w-4" /> RFQs</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Network">
          <CommandItem onSelect={() => go("/suppliers")}><Users className="me-2 h-4 w-4" /> Suppliers</CommandItem>
          <CommandItem onSelect={() => go("/buyers")}><Building2 className="me-2 h-4 w-4" /> Buyers</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ============= Revenue & Profit Chart =============
function RevenueProfitChart() {
  const [range, setRange] = useState<"3M" | "6M" | "12M">("12M");
  const data = useMemo(() => {
    if (range === "3M") return revenueSeries.slice(-3);
    if (range === "6M") return revenueSeries.slice(-6);
    return revenueSeries;
  }, [range]);

  return (
    <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Revenue & Profit</h3>
          <p className="text-xs text-muted-foreground">USD (M) · rolling window</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Revenue</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Profit</span>
          </div>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(["3M", "6M", "12M"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition",
                  range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >{r}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
            <XAxis dataKey="m" fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <YAxis fontSize={11} className="text-muted-foreground" stroke="currentColor" tickFormatter={(v) => `$${v}M`} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
              formatter={(v: number) => `$${v}M`}
            />
            <Area type="monotone" dataKey="revenue" stroke="oklch(0.62 0.16 155)" strokeWidth={2} fill="url(#revFill)" />
            <Line type="monotone" dataKey="profit" stroke="oklch(0.78 0.15 75)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="target" stroke="oklch(0.65 0.05 250)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============= AI Quick Panel =============
function AiQuickPanel({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant relative overflow-hidden">
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Nova AI Copilot</h3>
            <p className="text-[11px] text-muted-foreground">Ask anything about your trade</p>
          </div>
        </div>
        <Link to="/nova-ai" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="relative space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Forecast Egyptian orange prices for Q3…"
          rows={3}
          className="resize-none bg-background/60"
        />
        <div className="flex flex-wrap gap-1.5">
          {aiPrompts.map((p) => (
            <button
              key={p}
              onClick={() => onSubmit(p)}
              className="text-[11px] px-2 py-1 rounded-full border border-border bg-background/60 hover:border-primary/50 hover:text-primary transition truncate max-w-full"
            >{p}</button>
          ))}
        </div>
        <Button
          className="w-full bg-gradient-primary shadow-glow gap-2"
          disabled={!prompt.trim()}
          onClick={() => onSubmit(prompt.trim())}
        >
          <Send className="h-4 w-4" /> Ask Nova
        </Button>
      </div>
    </div>
  );
}

// ============= Trade Performance =============
function TradePerformance() {
  const exportsTotal = monthlyTrade.reduce((s, x) => s + x.exports, 0);
  const importsTotal = monthlyTrade.reduce((s, x) => s + x.imports, 0);
  return (
    <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Export vs Import Performance</h3>
          <p className="text-xs text-muted-foreground">Last 7 months · USD (B)</p>
        </div>
        <div className="flex gap-4 text-xs">
          <div><div className="text-muted-foreground text-[10px]">Exports</div><div className="font-semibold text-primary">${exportsTotal.toFixed(1)}B</div></div>
          <div><div className="text-muted-foreground text-[10px]">Imports</div><div className="font-semibold text-amber-500">${importsTotal.toFixed(1)}B</div></div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyTrade}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
            <XAxis dataKey="month" fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <YAxis fontSize={11} className="text-muted-foreground" stroke="currentColor" tickFormatter={(v) => `$${v}B`} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
              formatter={(v: number) => `$${v}B`}
            />
            <Bar dataKey="exports" fill="oklch(0.62 0.16 155)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="imports" fill="oklch(0.78 0.15 75)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============= Commodity Ticker =============
function CommodityTicker() {
  const [data, setData] = useState<Commodity[]>(seedCommodities);
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) =>
        prev.map((c) => {
          const jitter = (Math.random() - 0.5) * 0.006;
          const nextPrice = +(c.price * (1 + jitter)).toFixed(c.price < 10 ? 2 : 1);
          const change = +(c.change + jitter * 100).toFixed(2);
          return { ...c, price: nextPrice, change, spark: [...c.spark.slice(1), nextPrice] };
        })
      );
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Live commodity prices</h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Streaming
          </p>
        </div>
        <Link to="/market" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          Market <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {data.map((c) => {
          const up = c.change >= 0;
          return (
            <li key={c.symbol} className="py-2.5 flex items-center gap-3">
              <div className="h-8 w-10 shrink-0 rounded-md bg-muted grid place-items-center text-[10px] font-bold font-mono">{c.symbol}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.unit}</div>
              </div>
              <div className="h-8 w-16 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={c.spark.map((v, i) => ({ i, v }))}>
                    <Line type="monotone" dataKey="v" stroke={up ? "oklch(0.62 0.16 155)" : "oklch(0.65 0.2 20)"} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-right shrink-0 w-20">
                <div className="text-sm font-semibold tabular-nums">{c.price >= 100 ? c.price.toFixed(0) : c.price.toFixed(2)}</div>
                <div className={cn("text-[10px] font-semibold tabular-nums", up ? "text-emerald-500" : "text-rose-500")}>
                  {up ? "+" : ""}{c.change.toFixed(2)}%
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ============= Active Shipments =============
function ActiveShipmentsWidget() {
  const items = shipments.filter((s) => s.status !== "delivered").slice(0, 4);
  return (
    <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Active shipments</h3>
          <p className="text-xs text-muted-foreground">{items.length} in progress</p>
        </div>
        <Link to="/export" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          All shipments <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {items.map((s) => (
          <li key={s.id}>
            <Link to="/export" className="py-3 flex items-center gap-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <Ship className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="font-mono text-xs">{s.id}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="text-xs text-muted-foreground truncate">{s.origin} → {s.destination}</div>
                <Progress value={s.progress} className="h-1 mt-2" />
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{currency(s.value_usd)}</div>
                <div className="text-[10px] text-muted-foreground">ETA {s.eta}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============= Weather Summary =============
function WeatherSummary() {
  const iconOf = (k: "sun" | "cloud" | "rain") => k === "sun" ? Sun : k === "rain" ? CloudRain : Cloud;
  return (
    <Link
      to="/weather"
      className="rounded-2xl border border-border bg-card p-5 shadow-elegant hover:border-primary/50 transition block"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Weather</h3>
          <p className="text-xs text-muted-foreground">Growing regions</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <ul className="space-y-3">
        {weatherCities.map((w) => {
          const Icon = iconOf(w.icon);
          return (
            <li key={w.city} className="flex items-center gap-3 rounded-xl bg-background/60 p-3 border border-border">
              <Icon className="h-8 w-8 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{w.city}</div>
                <div className="text-[11px] text-muted-foreground truncate">{w.region} · {w.cond}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-display font-bold">{w.temp}°</div>
                <div className="text-[10px] text-muted-foreground">{w.hi}° / {w.lo}°</div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-2 text-xs bg-amber-500/10 text-amber-500 rounded-lg px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5" /> Wind advisory · Nile Delta
      </div>
    </Link>
  );
}

// ============= Recent Orders =============
function RecentOrdersWidget() {
  const recent = orders.slice(0, 5);
  return (
    <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Recent orders</h3>
          <p className="text-xs text-muted-foreground">Latest transactions</p>
        </div>
        <Link to="/orders" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
          All orders <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-start px-2 py-2">Order</th>
              <th className="text-start px-2 py-2 hidden sm:table-cell">Product</th>
              <th className="text-end px-2 py-2">Value</th>
              <th className="text-start px-2 py-2 hidden md:table-cell">ETA</th>
              <th className="text-start px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recent.map((o) => (
              <tr key={o.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => window.location.assign("/orders")}>
                <td className="px-2 py-3 font-mono text-xs">{o.id}</td>
                <td className="px-2 py-3 hidden sm:table-cell truncate">{o.product_name}</td>
                <td className="px-2 py-3 text-end font-semibold">{currency(o.total_usd)}</td>
                <td className="px-2 py-3 hidden md:table-cell text-muted-foreground">{o.eta}</td>
                <td className="px-2 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============= Mini Calendar =============
function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const shipmentEtaDays = new Set(
    shipments.filter((s) => {
      const d = new Date(s.eta);
      return d.getFullYear() === year && d.getMonth() === month;
    }).map((s) => new Date(s.eta).getDate())
  );

  const upcoming = [...shipments]
    .filter((s) => new Date(s.eta) >= new Date(year, month, 1))
    .sort((a, b) => a.eta.localeCompare(b.eta))
    .slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {first.toLocaleString("en", { month: "long", year: "numeric" })}
          </h3>
          <p className="text-xs text-muted-foreground">Upcoming shipments</p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="h-6 grid place-items-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const isToday = d === now.getDate();
          const has = d != null && shipmentEtaDays.has(d);
          return (
            <div
              key={i}
              className={cn(
                "h-8 grid place-items-center text-xs rounded-md relative",
                d == null && "opacity-0",
                isToday ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted"
              )}
            >
              {d}
              {has && !isToday && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 space-y-2">
        {upcoming.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            <span className="font-mono">{s.id}</span>
            <span className="truncate text-muted-foreground flex-1">{s.destination}</span>
            <span className="text-muted-foreground shrink-0">{s.eta.slice(5)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============= Approvals =============
function ApprovalsWidget() {
  const [items, setItems] = useState(pendingApprovals);
  const decide = (id: string, ok: boolean) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(ok ? "Approved" : "Rejected");
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Pending approvals
          </h3>
          <p className="text-xs text-muted-foreground">{items.length} require your attention</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">All caught up 🎉</div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-3 hover:border-primary/40 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-wider">{a.type}</span>
                    <div className="text-sm font-semibold truncate">{a.title}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">{a.meta}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">by {a.requestedBy}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => decide(a.id, false)}>Reject</Button>
                  <Button size="sm" className="bg-primary" onClick={() => decide(a.id, true)}>Approve</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============= Tasks =============
function TasksWidget() {
  const [tasks, setTasks] = useState(initialTasks);
  const toggle = (id: string) => setTasks((p) => p.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const remaining = tasks.filter((t) => !t.done).length;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" /> Tasks & reminders
          </h3>
          <p className="text-xs text-muted-foreground">{remaining} open · {tasks.length - remaining} done</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.message("Task creation coming soon")}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition">
            <Checkbox checked={t.done} onCheckedChange={() => toggle(t.id)} />
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm truncate", t.done && "line-through text-muted-foreground")}>{t.title}</div>
              <div className="text-[10px] text-muted-foreground">Due {t.due}</div>
            </div>
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0",
              t.priority === "high" && "bg-rose-500/15 text-rose-500",
              t.priority === "med" && "bg-amber-500/15 text-amber-500",
              t.priority === "low" && "bg-muted text-muted-foreground",
            )}>{t.priority}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============= Top Partners =============
function TopPartners({ kind }: { kind: "suppliers" | "buyers" }) {
  const items = (kind === "suppliers"
    ? [...suppliers].sort((a, b) => b.volume_usd - a.volume_usd).slice(0, 5).map((s) => ({
        id: s.id, name: s.company, country: s.country, value: s.volume_usd, rating: s.rating,
      }))
    : [...buyers].sort((a, b) => b.spend_usd - a.spend_usd).slice(0, 5).map((b) => ({
        id: b.id, name: b.company, country: b.country, value: b.spend_usd, rating: b.rating,
      }))
  );
  const to = kind === "suppliers" ? "/suppliers" : "/buyers";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Top {kind}</h3>
          <p className="text-xs text-muted-foreground">By {kind === "suppliers" ? "volume" : "spend"} · 30d</p>
        </div>
        <Link to={to} className="text-xs text-primary hover:underline">All</Link>
      </div>
      <ul className="space-y-2">
        {items.map((i, idx) => (
          <Link key={i.id} to={to} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-primary text-primary-foreground grid place-items-center text-sm font-bold">
              {i.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{i.name}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                {i.country} · <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {i.rating}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-semibold">{currency(i.value)}</div>
              <div className="text-[10px] text-muted-foreground">#{idx + 1}</div>
            </div>
          </Link>
        ))}
      </ul>
    </div>
  );
}

// ============= Country Stats =============
function CountryStats() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" /> Country statistics
          </h3>
          <p className="text-xs text-muted-foreground">Top export destinations</p>
        </div>
      </div>
      <ul className="space-y-3">
        {topCountries.map((c) => (
          <li key={c.country}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{c.flag}</span>
                <span className="font-medium truncate">{c.country}</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground shrink-0">{currency(c.volume)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all duration-700" style={{ width: `${c.share * 4.5}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============= Market Trends =============
function MarketTrendsWidget() {
  const [visible, setVisible] = useState({ wheat: true, coffee: true, rice: true });
  return (
    <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Market trends</h3>
          <p className="text-xs text-muted-foreground">8-week commodity movement</p>
        </div>
        <div className="flex gap-2 text-xs">
          {([
            { k: "wheat", label: "Wheat", color: "oklch(0.62 0.16 155)" },
            { k: "coffee", label: "Coffee", color: "oklch(0.78 0.15 75)" },
            { k: "rice", label: "Rice", color: "oklch(0.65 0.18 250)" },
          ] as const).map((s) => (
            <button
              key={s.k}
              onClick={() => setVisible((v) => ({ ...v, [s.k]: !v[s.k] }))}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition",
                visible[s.k] ? "border-border" : "border-transparent opacity-40"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={marketTrendSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
            <XAxis dataKey="w" fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <YAxis fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
            {visible.wheat && <Line type="monotone" dataKey="wheat" stroke="oklch(0.62 0.16 155)" strokeWidth={2} dot={false} />}
            {visible.coffee && <Line type="monotone" dataKey="coffee" stroke="oklch(0.78 0.15 75)" strokeWidth={2} dot={false} />}
            {visible.rice && <Line type="monotone" dataKey="rice" stroke="oklch(0.65 0.18 250)" strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============= Inventory =============
function InventoryOverview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-lg">Inventory overview</h3>
          <p className="text-xs text-muted-foreground">Stock level by category</p>
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="30%" outerRadius="100%" data={inventoryByCategory} startAngle={90} endAngle={-270}>
            <RadialBar background dataKey="value" cornerRadius={6} />
            <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => `${v}%`} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============= Activity Timeline =============
function ActivityTimelineWidget() {
  const iconOf: Record<string, React.ComponentType<{ className?: string }>> = {
    ship: Ship, quote: FileText, check: CheckCircle2, rfq: FileQuestion, shield: Shield,
    alert: AlertTriangle, cloud: Cloud, contract: ScrollText,
  };
  const toneOf: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    info: "bg-blue-500/15 text-blue-500",
    success: "bg-emerald-500/15 text-emerald-500",
    warning: "bg-amber-500/15 text-amber-500",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Recent activities</h3>
          <p className="text-xs text-muted-foreground">Real-time across your organization</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.message("Filter opened")}>
          Filter
        </Button>
      </div>
      <ol className="relative ms-3 border-s border-border space-y-4">
        {activityTimeline.map((e) => {
          const Icon = iconOf[e.icon] ?? Circle;
          return (
            <li key={e.id} className="ms-6 relative">
              <span className={cn("absolute -start-9 top-0 h-6 w-6 rounded-full grid place-items-center", toneOf[e.tone])}>
                <Icon className="h-3 w-3" />
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm truncate">{e.text}</div>
                <div className="text-[10px] text-muted-foreground shrink-0">{e.time} ago</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
