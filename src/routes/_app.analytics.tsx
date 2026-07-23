import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart3, TrendingUp, DollarSign, Globe2, Download, FileSpreadsheet, FileText,
  Package, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/filter-chips";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend, ComposedChart,
} from "recharts";
import { monthlyTrade, topCountries, currency } from "@/lib/demo-data";
import { revenueSeries } from "@/lib/dashboard-data";
import {
  analyticsKpis, presetRange, REPORTS, type RangePreset,
} from "@/lib/reports/data";
import { exportCsv, exportExcel, exportPdf } from "@/lib/reports/export";

export const Route = createFileRoute("/_app/analytics")({ component: AnalyticsPage });

const CATEGORY_MIX = [
  { name: "Fruits", value: 32 },
  { name: "Grains", value: 28 },
  { name: "Beverages", value: 16 },
  { name: "Oils", value: 12 },
  { name: "Spices", value: 8 },
  { name: "Herbs", value: 4 },
];
const COLORS = ["hsl(var(--primary))", "#eab308", "#3b82f6", "#a855f7", "#ec4899", "#22d3ee"];

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "ytd", label: "YTD" },
  { value: "12m", label: "12M" },
  { value: "all", label: "All" },
];

const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 };

function AnalyticsPage() {
  const [preset, setPreset] = useState<RangePreset>("12m");
  const [metric, setMetric] = useState<"revenue" | "profit" | "target">("revenue");

  const range = useMemo(() => presetRange(preset), [preset]);
  const kpis = useMemo(() => analyticsKpis(range), [range]);

  const trendSeries = useMemo(() => {
    const cutoff = preset === "30d" ? 1 : preset === "90d" ? 3 : preset === "ytd" ? 7 : preset === "12m" ? 12 : 12;
    return revenueSeries.slice(-cutoff);
  }, [preset]);

  function exportSnapshot(format: "csv" | "xls" | "pdf") {
    const report = REPORTS.find((r) => r.id === "orders_ledger");
    if (!report) return;
    const rows = report.rows(range);
    try {
      if (format === "csv") exportCsv(report, rows);
      else if (format === "xls") exportExcel(report, rows);
      else exportPdf(report, rows, range);
      toast.success(`Analytics snapshot · ${format.toUpperCase()} ready`);
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Cross-network performance insights · live KPIs, charts and drilldowns"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportSnapshot("csv")}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportSnapshot("xls")}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportSnapshot("pdf")}>
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        }
      />

      <Card className="p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date range</label>
          <div className="mt-1"><FilterChips value={preset} onChange={setPreset} options={PRESETS} /></div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Primary metric</label>
          <Select value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
            <SelectTrigger className="mt-1 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="profit">Net profit</SelectItem>
              <SelectItem value="target">Target</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ms-auto text-xs text-muted-foreground">
          Period: <span className="font-semibold text-foreground">{range.from.toISOString().slice(0, 10)} → {range.to.toISOString().slice(0, 10)}</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Trade volume" value={currency(kpis.gmv || 24_800_000)} delta={18} icon={DollarSign} />
        <StatCard label="Orders" value={(kpis.ordersCount || 128).toLocaleString()} delta={12} icon={Package} tint="info" />
        <StatCard label="Fulfillment" value={`${(kpis.fulfillment || 96.4).toFixed(1)}%`} delta={2} icon={TrendingUp} tint="gold" />
        <StatCard label="Outstanding AR" value={currency(kpis.outstanding || 412_000)} delta={-6} icon={ShieldCheck} tint="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold">Revenue vs profit vs target</h3>
              <p className="text-xs text-muted-foreground">USD millions · trailing period</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <ComposedChart data={trendSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `$${v.toFixed(2)}M`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#eab308" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="target" stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-1">Category mix</h3>
          <p className="text-xs text-muted-foreground mb-3">Share of platform GMV</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={CATEGORY_MIX} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {CATEGORY_MIX.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h3 className="font-display font-bold mb-1">Exports vs imports</h3>
          <p className="text-xs text-muted-foreground mb-3">Monthly trade volume · USD millions</p>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={monthlyTrade}>
                <defs>
                  <linearGradient id="expA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="impA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `$${v.toFixed(2)}M`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="exports" stroke="hsl(var(--primary))" fill="url(#expA)" strokeWidth={2} />
                <Area type="monotone" dataKey="imports" stroke="#eab308" fill="url(#impA)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-1">Key metrics</h3>
          <p className="text-xs text-muted-foreground mb-3">Operational health signals</p>
          <div className="space-y-4">
            {[
              { label: "Repeat buyer rate", value: "68%" },
              { label: "Avg lead time", value: "11 days" },
              { label: "On-time delivery", value: "94%" },
              { label: "Dispute rate", value: "0.8%" },
              { label: "Customs clearance", value: "2.3 days" },
              { label: "Supplier NPS", value: "72" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold">{m.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h3 className="font-display font-bold mb-1">Top destination markets</h3>
          <p className="text-xs text-muted-foreground mb-3">Export volume by country</p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topCountries.map(c => ({ name: c.country, volume: c.volume / 1_000_000 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `$${v.toFixed(2)}M`} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-1">Global footprint</h3>
          <p className="text-xs text-muted-foreground mb-3">Ranked destinations</p>
          <div className="space-y-3">
            {topCountries.map((c) => (
              <div key={c.country} className="flex items-center gap-3">
                <span className="text-xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold truncate">{c.country}</span>
                    <span className="text-muted-foreground text-xs">{c.share}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${c.share * 3}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold flex items-center gap-2"><Globe2 className="h-4 w-4 text-primary" /> Selected metric trend</h3>
              <p className="text-xs text-muted-foreground capitalize">{metric} · trailing period</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `$${v.toFixed(2)}M`} />
                <Line type="monotone" dataKey={metric} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
