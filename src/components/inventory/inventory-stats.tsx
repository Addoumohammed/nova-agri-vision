/**
 * Inventory stats — five headline metrics at the top of the workspace.
 */
import { AlertTriangle, Boxes, PackageX, Warehouse as WarehouseIcon, Weight } from "lucide-react";
import { formatCompact } from "@/lib/inventory/format";
import type { InventoryStats } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";

export function InventoryStatsCards({ stats }: { stats: InventoryStats }) {
  const { t } = useI18n();
  const items: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
    { label: t("inventory.stats.items"), value: stats.totalItems.toLocaleString(),
      icon: Boxes, tone: "bg-primary/10 text-primary" },
    { label: t("inventory.stats.quantity"), value: formatCompact(stats.totalQuantity, "u"),
      icon: Weight, tone: "bg-sky-500/10 text-sky-500" },
    { label: t("inventory.stats.low"), value: stats.lowStockCount.toLocaleString(),
      icon: AlertTriangle, tone: "bg-amber-500/10 text-amber-500" },
    { label: t("inventory.stats.out"), value: stats.outOfStockCount.toLocaleString(),
      icon: PackageX, tone: "bg-rose-500/10 text-rose-500" },
    { label: t("inventory.stats.warehouses"), value: stats.warehousesCount.toLocaleString(),
      icon: WarehouseIcon, tone: "bg-emerald-500/10 text-emerald-500" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-border bg-card p-4 shadow-elegant">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{it.label}</p>
            <div className={`h-8 w-8 rounded-lg grid place-items-center ${it.tone}`}>
              <it.icon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
