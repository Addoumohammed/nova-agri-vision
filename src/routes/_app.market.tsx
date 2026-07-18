import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  TrendingUp,
  Filter,
  Globe2,
  Leaf,
  Flame,
  Star,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/market")({
  component: MarketPage,
});

type Row = {
  s: string;
  cat: "Grains" | "Fruits" | "Vegetables" | "Softs";
  country: string;
  m: string;
  p: number;
  c: number;
  v: string;
  spark: number[];
  up: boolean;
};

const rows: Row[] = [
  { s: "Wheat", cat: "Grains", country: "🇺🇸 USA", m: "CBOT", p: 6.24, c: 1.4, v: "1.2M", spark: [4, 4.2, 4.1, 4.5, 4.8, 5, 5.4, 5.6, 6, 6.24], up: true },
  { s: "Corn", cat: "Grains", country: "🇺🇸 USA", m: "CBOT", p: 4.71, c: -0.8, v: "980k", spark: [5, 4.9, 4.8, 4.85, 4.7, 4.75, 4.72, 4.7, 4.71, 4.71], up: false },
  { s: "Soybeans", cat: "Grains", country: "🇧🇷 Brazil", m: "CBOT", p: 13.42, c: 2.1, v: "2.1M", spark: [12, 12.2, 12.4, 12.6, 12.9, 13.1, 13.2, 13.3, 13.4, 13.42], up: true },
  { s: "Oranges", cat: "Fruits", country: "🇪🇬 Egypt", m: "ICE", p: 3.85, c: 6.2, v: "540k", spark: [3.1, 3.2, 3.3, 3.4, 3.5, 3.55, 3.6, 3.7, 3.8, 3.85], up: true },
  { s: "Cotton", cat: "Softs", country: "🇮🇳 India", m: "ICE", p: 0.82, c: -1.2, v: "780k", spark: [0.9, 0.88, 0.87, 0.86, 0.85, 0.84, 0.83, 0.82, 0.82, 0.82], up: false },
  { s: "Sugar", cat: "Softs", country: "🇧🇷 Brazil", m: "ICE", p: 0.23, c: 0.9, v: "1.4M", spark: [0.2, 0.21, 0.21, 0.22, 0.22, 0.22, 0.22, 0.23, 0.23, 0.23], up: true },
  { s: "Rice", cat: "Grains", country: "🇮🇳 India", m: "CBOT", p: 17.12, c: 3.4, v: "310k", spark: [15, 15.5, 15.8, 16, 16.4, 16.7, 16.9, 17, 17.1, 17.12], up: true },
  { s: "Coffee", cat: "Softs", country: "🇨🇴 Colombia", m: "ICE", p: 1.94, c: -2.6, v: "690k", spark: [2.1, 2.05, 2, 1.98, 1.97, 1.96, 1.95, 1.94, 1.94, 1.94], up: false },
  { s: "Potatoes", cat: "Vegetables", country: "🇪🇬 Egypt", m: "EEX", p: 0.42, c: 4.1, v: "220k", spark: [0.34, 0.35, 0.37, 0.38, 0.39, 0.4, 0.41, 0.41, 0.42, 0.42], up: true },
  { s: "Mangoes", cat: "Fruits", country: "🇮🇳 India", m: "APEDA", p: 2.15, c: 5.8, v: "180k", spark: [1.8, 1.85, 1.9, 1.95, 2.0, 2.05, 2.08, 2.1, 2.13, 2.15], up: true },
  { s: "Onions", cat: "Vegetables", country: "🇪🇬 Egypt", m: "APEDA", p: 0.29, c: -3.4, v: "410k", spark: [0.34, 0.33, 0.32, 0.31, 0.3, 0.3, 0.29, 0.29, 0.29, 0.29], up: false },
  { s: "Grapes", cat: "Fruits", country: "🇨🇱 Chile", m: "ICE", p: 4.32, c: 2.8, v: "260k", spark: [3.9, 3.95, 4.0, 4.1, 4.15, 4.2, 4.25, 4.28, 4.3, 4.32], up: true },
];

const categories = ["All", "Grains", "Fruits", "Vegetables", "Softs"] as const;
const countries = ["All", "🇺🇸 USA", "🇪🇬 Egypt", "🇧🇷 Brazil", "🇮🇳 India", "🇨🇴 Colombia", "🇨🇱 Chile"] as const;

const trendData = Array.from({ length: 30 }, (_, i) => ({
  d: `D${i + 1}`,
  wheat: 5.2 + Math.sin(i / 3) * 0.3 + i * 0.03,
  oranges: 3.1 + Math.sin(i / 4) * 0.15 + i * 0.025,
  rice: 15.4 + Math.cos(i / 5) * 0.4 + i * 0.05,
}));

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer>
        <LineChart data={data.map((v, i) => ({ i, v }))}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={up ? "oklch(0.65 0.16 150)" : "oklch(0.6 0.22 27)"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const [country, setCountry] = useState<(typeof countries)[number]>("All");

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (cat === "All" || r.cat === cat) &&
          (country === "All" || r.country === country) &&
          (q === "" || r.s.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, cat, country],
  );

  const popular = [...rows].sort((a, b) => Math.abs(b.c) - Math.abs(a.c)).slice(0, 4);

  const updates = [
    { t: "Egyptian orange demand surges in EU — +6.2%", time: "2m ago", icon: TrendingUp, color: "text-emerald-500" },
    { t: "Wheat futures cross $6.20 on tight supply", time: "18m ago", icon: Flame, color: "text-orange-500" },
    { t: "Brazilian sugar output beats forecast", time: "1h ago", icon: Leaf, color: "text-emerald-500" },
    { t: "Coffee retreats -2.6% on weaker demand", time: "3h ago", icon: ArrowDownRight, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("market.title")}</h1>
          <p className="text-muted-foreground">{t("market.sub")}</p>
        </div>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live · updated 2s ago
        </div>
      </div>

      {/* Price highlights */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {popular.map((r) => (
          <div key={r.s} className="rounded-2xl border border-border bg-card p-5 shadow-elegant hover-scale transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{r.s} · {r.country}</div>
              <Star className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-display font-bold font-mono">${r.p.toFixed(2)}</div>
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold",
                r.up ? "text-emerald-500" : "text-red-500",
              )}>
                {r.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {r.c > 0 ? "+" : ""}{r.c}%
              </span>
            </div>
            <div className="mt-2"><Sparkline data={r.spark} up={r.up} /></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-elegant space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search commodities…"
            className="ps-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3 w-3" /> Category:
          </div>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition",
                cat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe2 className="h-3 w-3" /> Country:
          </div>
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition",
                country === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Trends chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">Market trends</h3>
              <p className="text-xs text-muted-foreground">30-day price movement · USD</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.18 250)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.7 0.18 250)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.75 0.16 60)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.75 0.16 60)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="d" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="wheat" stroke="oklch(0.7 0.18 250)" fill="url(#gw)" strokeWidth={2} />
                <Area type="monotone" dataKey="oranges" stroke="oklch(0.75 0.16 60)" fill="url(#go)" strokeWidth={2} />
                <Area type="monotone" dataKey="rice" stroke="oklch(0.65 0.16 150)" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg mb-4">Recent updates</h3>
          <ul className="space-y-3">
            {updates.map((u, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <u.icon className={cn("h-4 w-4 mt-0.5 shrink-0", u.color)} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{u.t}</div>
                  <div className="text-xs text-muted-foreground">{u.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-start px-5 py-3 font-medium">{t("market.symbol")}</th>
                <th className="text-start px-5 py-3 font-medium hidden sm:table-cell">Origin</th>
                <th className="text-start px-5 py-3 font-medium hidden md:table-cell">{t("market.market")}</th>
                <th className="text-end px-5 py-3 font-medium">{t("market.price")}</th>
                <th className="text-end px-5 py-3 font-medium">{t("market.change")}</th>
                <th className="text-end px-5 py-3 font-medium hidden sm:table-cell">{t("market.volume")}</th>
                <th className="text-end px-5 py-3 font-medium hidden lg:table-cell">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.s} className="border-t border-border hover:bg-accent/40 transition">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{r.s}</div>
                    <div className="text-xs text-muted-foreground">{r.cat}</div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">{r.country}</td>
                  <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{r.m}</td>
                  <td className="px-5 py-4 text-end font-mono">${r.p.toFixed(2)}</td>
                  <td className="px-5 py-4 text-end">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold",
                      r.up ? "text-emerald-500" : "text-red-500")}>
                      {r.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {r.c > 0 ? "+" : ""}{r.c}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-end text-muted-foreground hidden sm:table-cell">{r.v}</td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex justify-end"><Sparkline data={r.spark} up={r.up} /></div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No commodities match your filters.
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={() => { setQ(""); setCat("All"); setCountry("All"); }}>
                        Clear filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
