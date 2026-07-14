import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/market")({
  component: MarketPage,
});

const rows = [
  { s: "Wheat", m: "CBOT", p: 6.24, c: 1.4, v: "1.2M", spark: [4, 4.2, 4.1, 4.5, 4.8, 5, 5.4, 5.6, 6, 6.24], up: true },
  { s: "Corn", m: "CBOT", p: 4.71, c: -0.8, v: "980k", spark: [5, 4.9, 4.8, 4.85, 4.7, 4.75, 4.72, 4.7, 4.71, 4.71], up: false },
  { s: "Soybeans", m: "CBOT", p: 13.42, c: 2.1, v: "2.1M", spark: [12, 12.2, 12.4, 12.6, 12.9, 13.1, 13.2, 13.3, 13.4, 13.42], up: true },
  { s: "Oranges", m: "ICE", p: 3.85, c: 6.2, v: "540k", spark: [3.1, 3.2, 3.3, 3.4, 3.5, 3.55, 3.6, 3.7, 3.8, 3.85], up: true },
  { s: "Cotton", m: "ICE", p: 0.82, c: -1.2, v: "780k", spark: [0.9, 0.88, 0.87, 0.86, 0.85, 0.84, 0.83, 0.82, 0.82, 0.82], up: false },
  { s: "Sugar", m: "ICE", p: 0.23, c: 0.9, v: "1.4M", spark: [0.2, 0.21, 0.21, 0.22, 0.22, 0.22, 0.22, 0.23, 0.23, 0.23], up: true },
  { s: "Rice", m: "CBOT", p: 17.12, c: 3.4, v: "310k", spark: [15, 15.5, 15.8, 16, 16.4, 16.7, 16.9, 17, 17.1, 17.12], up: true },
  { s: "Coffee", m: "ICE", p: 1.94, c: -2.6, v: "690k", spark: [2.1, 2.05, 2, 1.98, 1.97, 1.96, 1.95, 1.94, 1.94, 1.94], up: false },
];

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">{t("market.title")}</h1>
        <p className="text-muted-foreground">{t("market.sub")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-start">
                <th className="text-start px-5 py-3 font-medium">{t("market.symbol")}</th>
                <th className="text-start px-5 py-3 font-medium">{t("market.market")}</th>
                <th className="text-end px-5 py-3 font-medium">{t("market.price")}</th>
                <th className="text-end px-5 py-3 font-medium">{t("market.change")}</th>
                <th className="text-end px-5 py-3 font-medium">{t("market.volume")}</th>
                <th className="text-end px-5 py-3 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s} className="border-t border-border hover:bg-accent/40 transition">
                  <td className="px-5 py-4 font-semibold">{r.s}</td>
                  <td className="px-5 py-4 text-muted-foreground">{r.m}</td>
                  <td className="px-5 py-4 text-end font-mono">${r.p.toFixed(2)}</td>
                  <td className="px-5 py-4 text-end">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        r.up ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {r.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {r.c > 0 ? "+" : ""}
                      {r.c}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-end text-muted-foreground">{r.v}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <Sparkline data={r.spark} up={r.up} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
