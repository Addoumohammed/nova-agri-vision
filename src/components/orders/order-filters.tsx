/**
 * Search, status, role and sort chips — every control writes straight to URL
 * search params so state is shareable and back-button friendly.
 */
import { getRouteApi } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  ORDER_SORT_OPTIONS,
  ORDER_STATUSES,
} from "@/lib/orders/constants";
import type { OrderFilters as OrderFiltersType } from "@/lib/orders/types";

const routeApi = getRouteApi("/_app/orders");

interface Props {
  filters: OrderFiltersType;
  totalCount: number;
}

export function OrderFilters({ filters, totalCount }: Props) {
  const { t } = useI18n();
  const navigate = routeApi.useNavigate();
  const [q, setQ] = useState(filters.q);

  useEffect(() => setQ(filters.q), [filters.q]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === filters.q) return;
    const timer = window.setTimeout(() => {
      navigate({
        to: ".",
        search: {
          q: trimmed,
          status: filters.status,
          role: filters.role,
          sort: filters.sort,
          page: 1,
        },
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, filters, navigate]);

  function patch(next: Partial<OrderFiltersType>) {
    navigate({
      to: ".",
      search: {
        q: next.q ?? filters.q,
        status: next.status ?? filters.status,
        role: next.role ?? filters.role,
        sort: next.sort ?? filters.sort,
        page: next.page ?? 1,
      },
    });
  }

  function clearAll() {
    setQ("");
    navigate({
      to: ".",
      search: { q: "", status: "all", role: "all", sort: "newest", page: 1 },
    });
  }

  const hasFilters =
    filters.q || filters.status !== "all" || filters.role !== "all" || filters.sort !== "newest";

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 md:p-4 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 120))}
            placeholder={t("orders.searchPlaceholder")}
            className="ps-9"
            aria-label={t("orders.searchPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-2 md:flex md:items-center gap-2">
          <Select value={filters.role} onValueChange={(v) => patch({ role: v as OrderFiltersType["role"] })}>
            <SelectTrigger className="md:w-[150px]" aria-label={t("orders.role")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.role.all")}</SelectItem>
              <SelectItem value="buyer">{t("orders.role.buyer")}</SelectItem>
              <SelectItem value="supplier">{t("orders.role.supplier")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(v) => patch({ status: v as OrderFiltersType["status"] })}>
            <SelectTrigger className="md:w-[160px]" aria-label={t("orders.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.status.all")}</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`orders.status.${s}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as OrderFiltersType["sort"] })}>
            <SelectTrigger className="md:w-[180px]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t("orders.total").replace("{count}", String(totalCount))}
        </p>
        {hasFilters ? (
          <Button size="sm" variant="ghost" onClick={clearAll} className="gap-1 h-8">
            <X className="h-3.5 w-3.5" /> {t("orders.emptyFilters.action")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
