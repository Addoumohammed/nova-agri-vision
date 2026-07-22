/**
 * Inventory filters bar — URL-synced search, warehouse, status and sort.
 */
import { getRouteApi } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INVENTORY_SORT_OPTIONS } from "@/lib/inventory/constants";
import type { InventoryFilters, WarehouseRecord } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";

const routeApi = getRouteApi("/_app/inventory");
const ALL = "__all__";

interface Props {
  filters: InventoryFilters;
  warehouses: WarehouseRecord[];
  totalCount: number;
}

export function InventoryFilters({ filters, warehouses, totalCount }: Props) {
  const { t } = useI18n();
  const navigate = routeApi.useNavigate();
  const [qLocal, setQLocal] = useState(filters.q);

  useEffect(() => setQLocal(filters.q), [filters.q]);

  useEffect(() => {
    const trimmed = qLocal.trim();
    if (trimmed === filters.q) return;
    const tm = window.setTimeout(() => {
      navigate({
        to: ".",
        search: {
          q: trimmed,
          warehouseId: filters.warehouseId,
          status: filters.status,
          sort: filters.sort,
          page: 1,
        },
      });
    }, 250);
    return () => window.clearTimeout(tm);
  }, [qLocal, filters, navigate]);

  function patch(next: Partial<InventoryFilters>) {
    navigate({
      to: ".",
      search: {
        q: next.q ?? filters.q,
        warehouseId: next.warehouseId ?? filters.warehouseId,
        status: next.status ?? filters.status,
        sort: next.sort ?? filters.sort,
        page: next.page ?? 1,
      },
    });
  }

  function clearAll() {
    setQLocal("");
    navigate({
      to: ".",
      search: { q: "", warehouseId: "", status: "all", sort: "newest", page: 1 },
    });
  }

  const hasAny =
    filters.q || filters.warehouseId ||
    filters.status !== "all" || filters.sort !== "newest";

  return (
    <section
      aria-label="Filters"
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-elegant"
    >
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            placeholder={t("inventory.searchPlaceholder")}
            className="ps-9"
            aria-label={t("inventory.searchPlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Select
            value={filters.warehouseId || ALL}
            onValueChange={(v) => patch({ warehouseId: v === ALL ? "" : v })}
          >
            <SelectTrigger aria-label={t("inventory.warehouse")}>
              <SelectValue placeholder={t("inventory.allWarehouses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("inventory.allWarehouses")}</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(v) => patch({ status: v as InventoryFilters["status"] })}
          >
            <SelectTrigger aria-label={t("inventory.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("inventory.filter.all")}</SelectItem>
              <SelectItem value="in_stock">{t("inventory.filter.in_stock")}</SelectItem>
              <SelectItem value="low">{t("inventory.filter.low")}</SelectItem>
              <SelectItem value="out">{t("inventory.filter.out")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sort}
            onValueChange={(v) => patch({ sort: v as InventoryFilters["sort"] })}
          >
            <SelectTrigger aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVENTORY_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{t(o.labelKey as never)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("inventory.total").replace("{count}", String(totalCount))}</span>
        {hasAny && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            {t("inventory.emptyFilters.action")}
          </Button>
        )}
      </div>
    </section>
  );
}
