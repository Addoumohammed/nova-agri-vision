import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  shipped: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  in_transit: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  preparing: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  customs: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  overdue: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  delayed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status] ?? "bg-muted text-muted-foreground";
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-transparent capitalize", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
