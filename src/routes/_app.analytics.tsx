import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, DollarSign, Globe2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { monthlyTrade, topCountries, currency } from "@/lib/demo-data";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

const CATEGORY_MIX = [
  { name: "Fruits", value: 32 },
  { name: "Grains", value: 28 },
  { name: "Beverages", value: 16 },
  { name: "Oils", value: 12 },
  { name: "Spices", value: 8 },
  { name: "Herbs", value: 4 },
];
const COLORS = ["hsl(var(--primary))", "#eab308", "#3b82f6", "#a855f7", "#ec4899", "#22d3ee"];

function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Cross-network performance insights" icon={BarChart3} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Trade volume YTD" value={currency(24_800_000)} delta={18} icon={DollarSign} />
        <StatCard label="Active markets" value="42" delta={6} icon={Globe2} tint="info" />
        <StatCard label="Fulfillment rate" value="96.4%" delta={2} icon={TrendingUp} tint="gold" />
        <StatCard label="Avg deal size" value={currency(84_200)} delta={9} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold">Exports vs Imports</h3>
              <p className="text-xs text-muted-foreground">Trade volume in USD millions</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={monthlyTrade}>
                <defs>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="imp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area type="monotone" dataKey="exports" stroke="hsl(var(--primary))" fill="url(#exp)" strokeWidth={2} />
                <Area type="monotone" dataKey="imports" stroke="#eab308" fill="url(#imp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-bold mb-1">Category mix</h3>
          <p className="text-xs text-muted-foreground mb-3">Share of platform GMV</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={CATEGORY_MIX} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {CATEGORY_MIX.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-bold mb-1">Top destination markets</h3>
          <p className="text-xs text-muted-foreground mb-3">Export volume by country</p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topCountries.map(c => ({ name: c.country, volume: c.volume / 1_000_000 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: number) => `$${v.toFixed(2)}M`} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-bold mb-3">Key metrics</h3>
          <div className="space-y-4">
            {[
              { label: "Repeat buyer rate", value: "68%" },
              { label: "Avg lead time", value: "11 days" },
              { label: "On-time delivery", value: "94%" },
              { label: "Dispute rate", value: "0.8%" },
              { label: "Customs clearance", value: "2.3 days" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
