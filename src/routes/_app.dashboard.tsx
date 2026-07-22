import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ArrowUpRight, ArrowDownRight, Ship, Sparkles, DollarSign, Cloud, CloudRain, Sun,
  Bell, Plus, FileText, TrendingUp, AlertTriangle, CheckCircle2, Package, BarChart3,
  ChevronRight, Search as SearchIcon, Command, Users, Building2, FileQuestion,
  CalendarDays, ClipboardCheck, ListTodo, Send, Info, Shield, ScrollText, Circle,
  Activity, Wallet, ArrowRight, Star, Globe2, Filter as FilterIcon, X,
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

// ─────────────────────────── helpers ───────────────────────────

/** Respect prefers-reduced-motion; skip animation for users who requested less motion. */
function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setV(target); return; }
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

/** Shared card shell — removes 10+ duplicated wrapper classNames. */
function Card({
  children, className, as: As = "section", labelledBy,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
  labelledBy?: string;
}) {
  return (
    <As
      className={cn(
        "rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-elegant",
        className,
      )}
      aria-labelledby={labelledBy}
    >
      {children}
    </As>
  );
}

function CardHeader({
  title, subtitle, icon: Icon, action, id,
}: {
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4">
      <div className="min-w-0">
        <h3 id={id} className="font-display font-semibold text-lg flex items-center gap-2 truncate">
          {Icon && <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden />}
          <span className="truncate">{title}</span>
        </h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// Chart tooltip style shared across all charts.
const chartTooltip = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

// ─────────────────────────── page ───────────────────────────

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

  const activeShipmentsCount = useMemo(
    () => shipments.filter((s) => s.status !== "delivered").length, [],
  );
  const openOrdersCount = useMemo(
    () => orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length, [],
  );

  const totalRevenue = useCountUp(8_120_000);
  const netProfit = useCountUp(1_940_000);
  const activeShipments = useCountUp(activeShipmentsCount);
  const openOrders = useCountUp(openOrdersCount);

  const askNova = useCallback(
    (prompt: string) => navigate({ to: "/nova-ai", search: { prompt } as never }),
    [navigate],
  );

  return (
    <div className="space-y-6">
      <CommandBar onOpenPalette={() => setCmdOpen(true)} />

      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">{t("dash.welcome")}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t("dash.overview")}</p>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live · updated just now
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue (MTD)" value={fmtCompact(totalRevenue)} delta={12.4} icon={DollarSign} tint="emerald" to="/analytics" />
        <Kpi label="Net Profit" value={fmtCompact(netProfit)} delta={8.6} icon={Wallet} tint="amber" to="/analytics" />
        <Kpi label="Active Shipments" value={Math.round(activeShipments).toString()} delta={3.2} icon={Ship} tint="blue" to="/shipments" />
        <Kpi label="Open Orders" value={Math.round(openOrders).toString()} delta={-1.4} icon={Package} tint="violet" to="/orders" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueProfitChart />
        <AiQuickPanel onSubmit={askNova} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TradePerformance />
        <CommodityTicker />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ActiveShipmentsWidget />
        <WeatherSummary />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentOrdersWidget />
        <MiniCalendar />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ApprovalsWidget />
        <TasksWidget />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TopPartners kind="suppliers" />
        <TopPartners kind="buyers" />
        <CountryStats />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <MarketTrendsWidget />
        <InventoryOverview />
      </div>

      <ActivityTimelineWidget />

      <SearchPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

// ─────────────────────────── KPI ───────────────────────────

const Kpi = memo(function Kpi({
  label, value, delta, icon: Icon, tint, to,
}: {
  label: string; value: string; delta: number;
  icon: ComponentType<{ className?: string }>;
  tint: "emerald" | "amber" | "blue" | "violet";
  to: string;
}) {
  const up = delta >= 0;
  const tintCls: Record<string, string> = {
    emerald: "from-emerald-500/25", amber: "from-amber-500/25", blue: "from-blue-500/25", violet: "from-violet-500/25",
  };
  return (
    <Link
      to={to}
      aria-label={`${label}: ${value}, ${up ? "up" : "down"} ${Math.abs(delta)}%. View details.`}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-elegant hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/40 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", tintCls[tint])} aria-hidden />
      <div className="relative flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-accent grid place-items-center">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", up ? "text-emerald-500" : "text-rose-500")}>
          {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
          {Math.abs(delta)}%
        </span>
      </div>
      <div className="relative mt-4 text-2xl sm:text-3xl font-display font-bold tabular-nums">{value}</div>
      <div className="relative text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
    </Link>
  );
});

// ─────────────────────────── Command Bar ───────────────────────────

function CommandBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const navigate = useNavigate();
  const critical = useMemo(
    () => smartNotifications.filter((n) => n.severity === "critical" || n.severity === "warning").length,
    [],
  );

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Open command palette (Ctrl+K)"
        aria-keyshortcuts="Control+K Meta+K"
        className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left hover:border-primary/50 transition outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <span className="flex-1 text-sm text-muted-foreground truncate">
          Search orders, shipments, suppliers, insights…
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted">
          <Command className="h-3 w-3" aria-hidden /> K
        </kbd>
      </button>
      <NotificationsPopover badge={critical} />
      <QuickActionsMenu onNav={(to) => navigate({ to })} />
    </div>
  );
}

function NotificationsPopover({ badge }: { badge: number }) {
  const [read, setRead] = useState<Set<string>>(new Set());
  const unread = smartNotifications.length - read.size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative gap-2"
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline text-xs">Alerts</span>
          {badge > 0 && (
            <span
              className="absolute -top-1.5 -end-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center"
              aria-hidden
            >
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Smart notifications</div>
          <button
            type="button"
            className="text-xs text-primary hover:underline disabled:opacity-40"
            disabled={unread === 0}
            onClick={() => {
              setRead(new Set(smartNotifications.map((n) => n.id)));
              toast.success("All notifications marked as read");
            }}
          >
            Mark all read
          </button>
        </div>
        <ul className="max-h-96 overflow-y-auto divide-y divide-border" role="list">
          {smartNotifications.map((n) => {
            const isRead = read.has(n.id);
            return (
              <li
                key={n.id}
                className={cn(
                  "p-3 flex items-start gap-3 hover:bg-muted/50 transition cursor-pointer",
                  isRead && "opacity-60",
                )}
                onClick={() => setRead((r) => new Set(r).add(n.id))}
              >
                <span className={cn(
                  "mt-0.5 h-8 w-8 rounded-lg grid place-items-center shrink-0",
                  n.severity === "critical" && "bg-rose-500/15 text-rose-500",
                  n.severity === "warning" && "bg-amber-500/15 text-amber-500",
                  n.severity === "success" && "bg-emerald-500/15 text-emerald-500",
                  n.severity === "info" && "bg-blue-500/15 text-blue-500",
                )} aria-hidden>
                  {n.severity === "critical" || n.severity === "warning"
                    ? <AlertTriangle className="h-4 w-4" />
                    : n.severity === "success"
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <Info className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold truncate">{n.title}</div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{n.time}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                </div>
              </li>
            );
          })}
        </ul>

      </PopoverContent>
    </Popover>
  );
}

function QuickActionsMenu({ onNav }: { onNav: (to: string) => void }) {
  const actions = useMemo(() => [
    { icon: Plus, label: "New shipment", to: "/shipments" },
    { icon: FileQuestion, label: "New RFQ", to: "/rfq" },
    { icon: FileText, label: "New order", to: "/orders" },
    { icon: Users, label: "Invite supplier", to: "/suppliers" },
    { icon: Sparkles, label: "Ask Nova AI", to: "/nova-ai" },
  ], []);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="bg-gradient-primary shadow-glow gap-2" aria-label="Quick actions">
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Quick actions</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="grid gap-1" role="menu">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={() => onNav(a.to)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted transition text-start outline-none focus-visible:bg-muted"
            >
              <a.icon className="h-4 w-4 text-primary" aria-hidden />
              <span className="flex-1 truncate">{a.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
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
          <CommandItem onSelect={() => go("/dashboard")}><BarChart3 className="me-2 h-4 w-4" aria-hidden /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/nova-ai")}><Sparkles className="me-2 h-4 w-4" aria-hidden /> Nova AI</CommandItem>
          <CommandItem onSelect={() => go("/market")}><TrendingUp className="me-2 h-4 w-4" aria-hidden /> Marketplace</CommandItem>
          <CommandItem onSelect={() => go("/analytics")}><BarChart3 className="me-2 h-4 w-4" aria-hidden /> Analytics</CommandItem>
          <CommandItem onSelect={() => go("/weather")}><Cloud className="me-2 h-4 w-4" aria-hidden /> Weather</CommandItem>
          <CommandItem onSelect={() => go("/reports")}><FileText className="me-2 h-4 w-4" aria-hidden /> Reports</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Operations">
          <CommandItem onSelect={() => go("/orders")}><FileText className="me-2 h-4 w-4" aria-hidden /> Orders</CommandItem>
          <CommandItem onSelect={() => go("/invoices")}><FileText className="me-2 h-4 w-4" aria-hidden /> Invoices</CommandItem>
          <CommandItem onSelect={() => go("/shipments")}><Ship className="me-2 h-4 w-4" aria-hidden /> Shipments</CommandItem>
          <CommandItem onSelect={() => go("/rfq")}><FileQuestion className="me-2 h-4 w-4" aria-hidden /> RFQs</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Network">
          <CommandItem onSelect={() => go("/suppliers")}><Users className="me-2 h-4 w-4" aria-hidden /> Suppliers</CommandItem>
          <CommandItem onSelect={() => go("/buyers")}><Building2 className="me-2 h-4 w-4" aria-hidden /> Buyers</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => go("/profile")}><Shield className="me-2 h-4 w-4" aria-hidden /> Profile & Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ─────────────────────────── Revenue & Profit ───────────────────────────

function RevenueProfitChart() {
  const [range, setRange] = useState<"3M" | "6M" | "12M">("12M");
  const data = useMemo(() => {
    const n = range === "3M" ? 3 : range === "6M" ? 6 : 12;
    return revenueSeries.slice(-n);
  }, [range]);

  return (
    <Card className="lg:col-span-2" labelledBy="revenue-title">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 id="revenue-title" className="font-display font-semibold text-lg">Revenue &amp; Profit</h3>
          <p className="text-xs text-muted-foreground">USD (M) · rolling window</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden /> Revenue</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Profit</span>
          </div>
          <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Time range">
            {(["3M", "6M", "12M"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.62 0.16 155)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
            <XAxis dataKey="m" fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <YAxis fontSize={11} className="text-muted-foreground" stroke="currentColor" tickFormatter={(v) => `$${v}M`} />
            <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `$${v}M`} />
            <Area type="monotone" dataKey="revenue" stroke="oklch(0.62 0.16 155)" strokeWidth={2} fill="url(#revFill)" />
            <Line type="monotone" dataKey="profit" stroke="oklch(0.78 0.15 75)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="target" stroke="oklch(0.65 0.05 250)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ─────────────────────────── AI Quick Panel ───────────────────────────

function AiQuickPanel({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const trimmed = prompt.trim();
  const submit = () => { if (trimmed) onSubmit(trimmed); };
  return (
    <Card className="relative overflow-hidden" labelledBy="ai-panel-title">
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-primary opacity-20 blur-3xl pointer-events-none" aria-hidden />
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 id="ai-panel-title" className="font-display font-semibold truncate">Nova AI Copilot</h3>
            <p className="text-[11px] text-muted-foreground truncate">Ask anything about your trade</p>
          </div>
        </div>
        <Link to="/nova-ai" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 shrink-0">
          Open <ChevronRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="relative space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
          }}
          placeholder="e.g. Forecast Egyptian orange prices for Q3…"
          rows={3}
          maxLength={500}
          aria-label="Ask Nova AI"
          className="resize-none bg-background/60"
        />
        <div className="flex flex-wrap gap-1.5">
          {aiPrompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSubmit(p)}
              className="text-[11px] px-2 py-1 rounded-full border border-border bg-background/60 hover:border-primary/50 hover:text-primary transition truncate max-w-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {p}
            </button>
          ))}
        </div>
        <Button
          className="w-full bg-gradient-primary shadow-glow gap-2"
          disabled={!trimmed}
          onClick={submit}
        >
          <Send className="h-4 w-4" aria-hidden /> Ask Nova
        </Button>
        <div className="text-[10px] text-muted-foreground text-end">
          {prompt.length}/500 · <kbd className="font-mono">⌘ ⏎</kbd> to send
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────── Trade Performance ───────────────────────────

function TradePerformance() {
  const { exportsTotal, importsTotal } = useMemo(() => ({
    exportsTotal: monthlyTrade.reduce((s, x) => s + x.exports, 0),
    importsTotal: monthlyTrade.reduce((s, x) => s + x.imports, 0),
  }), []);
  return (
    <Card className="lg:col-span-2" labelledBy="trade-title">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 id="trade-title" className="font-display font-semibold text-lg">Export vs Import Performance</h3>
          <p className="text-xs text-muted-foreground">Last 7 months · USD (B)</p>
        </div>
        <div className="flex gap-4 text-xs">
          <div><div className="text-muted-foreground text-[10px]">Exports</div><div className="font-semibold text-primary tabular-nums">${exportsTotal.toFixed(1)}B</div></div>
          <div><div className="text-muted-foreground text-[10px]">Imports</div><div className="font-semibold text-amber-500 tabular-nums">${importsTotal.toFixed(1)}B</div></div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyTrade} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
            <XAxis dataKey="month" fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <YAxis fontSize={11} className="text-muted-foreground" stroke="currentColor" tickFormatter={(v) => `$${v}B`} />
            <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `$${v}B`} />
            <Bar dataKey="exports" fill="oklch(0.62 0.16 155)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="imports" fill="oklch(0.78 0.15 75)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ─────────────────────────── Commodity Ticker ───────────────────────────

function CommodityTicker() {
  const [data, setData] = useState<Commodity[]>(seedCommodities);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      setData((prev) =>
        prev.map((c) => {
          const jitter = (Math.random() - 0.5) * 0.006;
          const nextPrice = +(c.price * (1 + jitter)).toFixed(c.price < 10 ? 2 : 1);
          const change = +(c.change + jitter * 100).toFixed(2);
          return { ...c, price: nextPrice, change, spark: [...c.spark.slice(1), nextPrice] };
        })
      );
    };
    const start = () => { if (id == null) id = setInterval(tick, 3500); };
    const stop = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return (
    <Card labelledBy="ticker-title">
      <CardHeader
        id="ticker-title"
        title="Live commodity prices"
        subtitle="Streaming — pauses in background"
        action={
          <Link to="/market" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
            Market <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        }
      />
      <ul className="divide-y divide-border" aria-live="off">
        {data.map((c) => {
          const up = c.change >= 0;
          return (
            <li key={c.symbol} className="py-2.5 flex items-center gap-3">
              <div className="h-8 w-10 shrink-0 rounded-md bg-muted grid place-items-center text-[10px] font-bold font-mono">{c.symbol}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.unit}</div>
              </div>
              <div className="h-8 w-16 shrink-0" aria-hidden>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={c.spark.map((v, i) => ({ i, v }))}>
                    <Line type="monotone" dataKey="v" stroke={up ? "oklch(0.62 0.16 155)" : "oklch(0.65 0.2 20)"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
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
    </Card>
  );
}

// ─────────────────────────── Active Shipments ───────────────────────────

function ActiveShipmentsWidget() {
  const items = useMemo(() => shipments.filter((s) => s.status !== "delivered").slice(0, 4), []);
  return (
    <Card className="lg:col-span-2" labelledBy="ship-title">
      <CardHeader
        id="ship-title"
        title="Active shipments"
        subtitle={`${items.length} in progress`}
        action={
          <Link to="/shipments" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
            All shipments <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={Ship} title="No active shipments" hint="Create one from the Shipments workspace." />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                to="/shipments"
                className="py-3 flex items-center gap-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Shipment ${s.id}, ${s.origin} to ${s.destination}, ${s.progress}% complete, ETA ${s.eta}`}
              >
                <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <Ship className="h-4 w-4" aria-hidden />
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
                  <div className="text-sm font-semibold tabular-nums">{currency(s.value_usd)}</div>
                  <div className="text-[10px] text-muted-foreground">ETA {s.eta}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─────────────────────────── Weather ───────────────────────────

function WeatherSummary() {
  const iconOf = (k: "sun" | "cloud" | "rain") => k === "sun" ? Sun : k === "rain" ? CloudRain : Cloud;
  return (
    <Card className="hover:border-primary/50 transition p-0" labelledBy="weather-title">
      <Link
        to="/weather"
        className="block p-5 sm:p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        aria-label="Open Weather Intelligence"
      >
        <CardHeader
          id="weather-title"
          title="Weather"
          subtitle="Growing regions"
          action={<ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
        />
        <ul className="space-y-3">
          {weatherCities.map((w) => {
            const Icon = iconOf(w.icon);
            return (
              <li key={w.city} className="flex items-center gap-3 rounded-xl bg-background/60 p-3 border border-border">
                <Icon className="h-8 w-8 text-primary shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{w.city}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{w.region} · {w.cond}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-display font-bold tabular-nums">{w.temp}°</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">{w.hi}° / {w.lo}°</div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center gap-2 text-xs bg-amber-500/10 text-amber-500 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden /> Wind advisory · Nile Delta
        </div>
      </Link>
    </Card>
  );
}

// ─────────────────────────── Recent Orders ───────────────────────────

function RecentOrdersWidget() {
  const recent = useMemo(() => orders.slice(0, 5), []);
  return (
    <Card className="lg:col-span-2" labelledBy="orders-title">
      <CardHeader
        id="orders-title"
        title="Recent orders"
        subtitle="Latest transactions"
        action={
          <Link to="/orders" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
            All orders <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        }
      />
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <caption className="sr-only">Recent orders</caption>
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="text-start px-2 py-2">Order</th>
              <th scope="col" className="text-start px-2 py-2 hidden sm:table-cell">Product</th>
              <th scope="col" className="text-end px-2 py-2">Value</th>
              <th scope="col" className="text-start px-2 py-2 hidden md:table-cell">ETA</th>
              <th scope="col" className="text-start px-2 py-2">Status</th>
              <th scope="col" className="sr-only">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recent.map((o) => (
              <tr key={o.id} className="group hover:bg-muted/40">
                <td className="px-2 py-3 font-mono text-xs">{o.id}</td>
                <td className="px-2 py-3 hidden sm:table-cell truncate">{o.product_name}</td>
                <td className="px-2 py-3 text-end font-semibold tabular-nums">{currency(o.total_usd)}</td>
                <td className="px-2 py-3 hidden md:table-cell text-muted-foreground">{o.eta}</td>
                <td className="px-2 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-2 py-3 text-end">
                  <Link
                    to="/orders"
                    aria-label={`Open order ${o.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    Open <ChevronRight className="h-3 w-3" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─────────────────────────── Mini Calendar ───────────────────────────

function MiniCalendar() {
  const now = useMemo(() => new Date(), []);
  const { cells, monthLabel, shipmentEtaDays, upcoming, year, month, today } = useMemo(() => {
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

    return {
      cells,
      monthLabel: first.toLocaleString(undefined, { month: "long", year: "numeric" }),
      shipmentEtaDays,
      upcoming,
      year,
      month,
      today: now.getDate(),
    };
  }, [now]);

  return (
    <Card labelledBy="cal-title">
      <CardHeader
        id="cal-title"
        title={monthLabel}
        subtitle="Upcoming shipments"
        icon={CalendarDays}
      />
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1" aria-hidden>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="h-6 grid place-items-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel}>
        {cells.map((d, i) => {
          const isToday = d === today;
          const has = d != null && shipmentEtaDays.has(d);
          return (
            <div
              key={i}
              role="gridcell"
              aria-label={d != null ? `${monthLabel.split(" ")[0]} ${d}${has ? `, ${[...shipmentEtaDays].filter((x) => x === d).length} shipment ETA` : ""}` : undefined}
              className={cn(
                "h-8 grid place-items-center text-xs rounded-md relative tabular-nums",
                d == null && "opacity-0",
                isToday ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted",
              )}
            >
              {d}
              {has && !isToday && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden />}
            </div>
          );
        })}
      </div>
      {upcoming.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {upcoming.map((s) => (
            <li key={s.id}>
              <Link
                to="/shipments"
                className="flex items-center gap-2 text-xs hover:text-primary transition"
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />
                <span className="font-mono">{s.id}</span>
                <span className="truncate text-muted-foreground flex-1">{s.destination}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">{s.eta.slice(5)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No shipments scheduled this month.</p>
      )}
      {/* keep year/month referenced so lint stays happy in future edits */}
      <span className="hidden" data-year={year} data-month={month} />
    </Card>
  );
}

// ─────────────────────────── Approvals ───────────────────────────

function ApprovalsWidget() {
  const [items, setItems] = useState(pendingApprovals);
  const decide = (id: string, ok: boolean) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast[ok ? "success" : "message"](ok ? "Approved" : "Rejected", {
      description: item ? `${item.type} · ${item.title}` : undefined,
      action: {
        label: "Undo",
        onClick: () => item && setItems((prev) => [item, ...prev]),
      },
    });
  };
  return (
    <Card labelledBy="appr-title">
      <CardHeader
        id="appr-title"
        title="Pending approvals"
        subtitle={`${items.length} require your attention`}
        icon={ClipboardCheck}
      />
      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All caught up" hint="Nothing waiting on you right now." />
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
                  <Button size="sm" variant="outline" onClick={() => decide(a.id, false)} aria-label={`Reject ${a.title}`}>Reject</Button>
                  <Button size="sm" className="bg-primary" onClick={() => decide(a.id, true)} aria-label={`Approve ${a.title}`}>Approve</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─────────────────────────── Tasks ───────────────────────────

type Task = { id: string; title: string; due: string; priority: "high" | "med" | "low"; done: boolean };

function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks as Task[]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const toggle = (id: string) => setTasks((p) => p.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => setTasks((p) => p.filter((t) => t.id !== id));
  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setTasks((p) => [
      ...p,
      { id: `t${Date.now()}`, title, due: "Today", priority: "med", done: false },
    ]);
    setDraft("");
    setAdding(false);
    toast.success("Task added");
  };
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <Card labelledBy="tasks-title">
      <CardHeader
        id="tasks-title"
        title="Tasks & reminders"
        subtitle={`${remaining} open · ${tasks.length - remaining} done`}
        icon={ListTodo}
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </Button>
        }
      />
      {adding && (
        <div className="mb-3 flex gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); add(); }
              if (e.key === "Escape") { setAdding(false); setDraft(""); }
            }}
            placeholder="Task title…"
            aria-label="New task title"
            maxLength={120}
          />
          <Button size="sm" onClick={add} disabled={!draft.trim()}>Add</Button>
        </div>
      )}
      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks yet" hint="Add your first task above." />
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition">
              <Checkbox
                checked={t.done}
                onCheckedChange={() => toggle(t.id)}
                aria-label={`Mark task ${t.title} as ${t.done ? "not done" : "done"}`}
              />
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
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label={`Delete task ${t.title}`}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-rose-500 transition outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─────────────────────────── Top Partners ───────────────────────────

function TopPartners({ kind }: { kind: "suppliers" | "buyers" }) {
  const items = useMemo(() => (
    kind === "suppliers"
      ? [...suppliers].sort((a, b) => b.volume_usd - a.volume_usd).slice(0, 5).map((s) => ({
          id: s.id, name: s.company, country: s.country, value: s.volume_usd, rating: s.rating,
        }))
      : [...buyers].sort((a, b) => b.spend_usd - a.spend_usd).slice(0, 5).map((b) => ({
          id: b.id, name: b.company, country: b.country, value: b.spend_usd, rating: b.rating,
        }))
  ), [kind]);
  const to = kind === "suppliers" ? "/suppliers" : "/buyers";
  const titleId = `top-${kind}-title`;
  return (
    <Card labelledBy={titleId}>
      <CardHeader
        id={titleId}
        title={`Top ${kind}`}
        subtitle={`By ${kind === "suppliers" ? "volume" : "spend"} · 30d`}
        action={<Link to={to} className="text-xs text-primary hover:underline">All</Link>}
      />
      <ul className="space-y-2">
        {items.map((i, idx) => (
          <li key={i.id}>
            <Link
              to={to}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`#${idx + 1} ${i.name}, ${i.country}, ${currency(i.value)}`}
            >
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-primary text-primary-foreground grid place-items-center text-sm font-bold">
                {i.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{i.name}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="truncate">{i.country}</span>
                  <span aria-hidden>·</span>
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" aria-hidden /> {i.rating}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-semibold tabular-nums">{currency(i.value)}</div>
                <div className="text-[10px] text-muted-foreground">#{idx + 1}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ─────────────────────────── Country Stats ───────────────────────────

function CountryStats() {
  // Normalize by max share so bars fill the row proportionally.
  const maxShare = useMemo(() => Math.max(...topCountries.map((c) => c.share)), []);
  return (
    <Card labelledBy="country-title">
      <CardHeader
        id="country-title"
        title="Country statistics"
        subtitle="Top export destinations"
        icon={Globe2}
      />
      <ul className="space-y-3">
        {topCountries.map((c) => {
          const width = Math.max(4, (c.share / maxShare) * 100);
          return (
            <li key={c.country}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0" aria-hidden>{c.flag}</span>
                  <span className="font-medium truncate">{c.country}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground shrink-0 tabular-nums">{currency(c.volume)}</span>
              </div>
              <div
                className="h-1.5 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={c.share}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${c.country} share ${c.share}%`}
              >
                <div className="h-full bg-gradient-primary transition-[width] duration-700" style={{ width: `${width}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ─────────────────────────── Market Trends ───────────────────────────

function MarketTrendsWidget() {
  const [visible, setVisible] = useState({ wheat: true, coffee: true, rice: true });
  const series = [
    { k: "wheat", label: "Wheat", color: "oklch(0.62 0.16 155)" },
    { k: "coffee", label: "Coffee", color: "oklch(0.78 0.15 75)" },
    { k: "rice", label: "Rice", color: "oklch(0.65 0.18 250)" },
  ] as const;
  return (
    <Card className="lg:col-span-2" labelledBy="trends-title">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 id="trends-title" className="font-display font-semibold text-lg">Market trends</h3>
          <p className="text-xs text-muted-foreground">8-week commodity movement</p>
        </div>
        <div className="flex gap-2 text-xs" role="group" aria-label="Toggle commodity series">
          {series.map((s) => (
            <button
              key={s.k}
              type="button"
              aria-pressed={visible[s.k]}
              onClick={() => setVisible((v) => ({ ...v, [s.k]: !v[s.k] }))}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                visible[s.k] ? "border-border" : "border-transparent opacity-40",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden /> {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={marketTrendSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
            <XAxis dataKey="w" fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <YAxis fontSize={11} className="text-muted-foreground" stroke="currentColor" />
            <Tooltip contentStyle={chartTooltip} />
            {visible.wheat && <Line type="monotone" dataKey="wheat" stroke="oklch(0.62 0.16 155)" strokeWidth={2} dot={false} />}
            {visible.coffee && <Line type="monotone" dataKey="coffee" stroke="oklch(0.78 0.15 75)" strokeWidth={2} dot={false} />}
            {visible.rice && <Line type="monotone" dataKey="rice" stroke="oklch(0.65 0.18 250)" strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ─────────────────────────── Inventory ───────────────────────────

function InventoryOverview() {
  return (
    <Card labelledBy="inv-title">
      <CardHeader id="inv-title" title="Inventory overview" subtitle="Stock level by category" />
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="30%" outerRadius="100%" data={inventoryByCategory} startAngle={90} endAngle={-270}>
            <RadialBar background dataKey="value" cornerRadius={6} />
            <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `${v}%`} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ─────────────────────────── Activity Timeline ───────────────────────────

const TONE_LABEL = {
  primary: "All", info: "Info", success: "Success", warning: "Alerts",
} as const;
type Tone = keyof typeof TONE_LABEL;

function ActivityTimelineWidget() {
  const [filter, setFilter] = useState<Tone | "all">("all");
  const iconOf: Record<string, ComponentType<{ className?: string }>> = {
    ship: Ship, quote: FileText, check: CheckCircle2, rfq: FileQuestion, shield: Shield,
    alert: AlertTriangle, cloud: Cloud, contract: ScrollText,
  };
  const toneOf: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    info: "bg-blue-500/15 text-blue-500",
    success: "bg-emerald-500/15 text-emerald-500",
    warning: "bg-amber-500/15 text-amber-500",
  };
  const filtered = useMemo(
    () => filter === "all" ? activityTimeline : activityTimeline.filter((e) => e.tone === filter),
    [filter],
  );
  const filters: Array<Tone | "all"> = ["all", "success", "warning", "info"];

  return (
    <Card labelledBy="timeline-title">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 id="timeline-title" className="font-display font-semibold text-lg">Recent activities</h3>
          <p className="text-xs text-muted-foreground">Real-time across your organization</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <FilterIcon className="h-3.5 w-3.5" aria-hidden /> Filter
              {filter !== "all" && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {TONE_LABEL[filter as Tone]}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-1">
            <div role="menu" className="grid gap-0.5">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="menuitemradio"
                  aria-checked={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-start text-sm px-2 py-1.5 rounded hover:bg-muted transition",
                    filter === f && "bg-muted font-semibold",
                  )}
                >
                  {f === "all" ? "All activity" : TONE_LABEL[f as Tone]}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No matching activity" hint="Try a different filter." />
      ) : (
        <ol className="relative ms-3 border-s border-border space-y-4">
          {filtered.map((e) => {
            const Icon = iconOf[e.icon] ?? Circle;
            return (
              <li key={e.id} className="ms-6 relative">
                <span className={cn("absolute -start-9 top-0 h-6 w-6 rounded-full grid place-items-center", toneOf[e.tone])} aria-hidden>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm truncate">{e.text}</div>
                  <div className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{e.time} ago</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

// ─────────────────────────── Shared ───────────────────────────

function EmptyState({
  icon: Icon, title, hint,
}: { icon: ComponentType<{ className?: string }>; title: string; hint?: string }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
