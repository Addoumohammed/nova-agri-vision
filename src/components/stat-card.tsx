import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tint = "primary",
}: {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  tint?: "primary" | "gold" | "info" | "danger";
}) {
  const tintCls =
    tint === "gold" ? "bg-gradient-gold text-gold-foreground"
    : tint === "info" ? "bg-blue-500/15 text-blue-400"
    : tint === "danger" ? "bg-rose-500/15 text-rose-400"
    : "bg-gradient-primary text-primary-foreground";
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition group">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-display font-bold truncate">{value}</div>
        </div>
        <div className={cn("h-10 w-10 shrink-0 rounded-xl grid place-items-center shadow-sm group-hover:scale-105 transition", tintCls)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {typeof delta === "number" && (
        <div className={cn("mt-3 inline-flex items-center gap-1 text-xs font-semibold", up ? "text-emerald-400" : "text-rose-400")}>
          {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(delta)}% vs last month
        </div>
      )}
    </div>
  );
}
