/**
 * Filters bar for the supplier products table. Search is debounced; every
 * change writes to the URL search params so state is bookmarkable / shareable.
 */
import { Search, X } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PRODUCT_SORT_OPTIONS } from "@/lib/products/constants";
import { useI18n } from "@/lib/i18n";
import type { OwnedCompany, ProductCategoryLite, ProductFilters } from "@/lib/products/types";

const routeApi = getRouteApi("/_app/products");
const ALL = "__all__";

interface Props {
  filters: ProductFilters;
  categories: ProductCategoryLite[];
  companies: OwnedCompany[];
  totalCount: number;
}

export function ProductFilters({ filters, categories, companies, totalCount }: Props) {
  const { t } = useI18n();
  const navigate = routeApi.useNavigate();
  const [qLocal, setQLocal] = useState(filters.q);

  useEffect(() => setQLocal(filters.q), [filters.q]);

  // Debounced push of the search term to the URL.
  useEffect(() => {
    const trimmed = qLocal.trim();
    if (trimmed === filters.q) return;
    const t = window.setTimeout(() => {
      navigate({
        to: ".",
        search: {
          q: trimmed,
          category: filters.category,
          status: filters.status,
          companyId: filters.companyId,
          sort: filters.sort,
          page: 1,
        },
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [qLocal, filters, navigate]);

  function patch(next: Partial<ProductFilters>) {
    navigate({
      to: ".",
      search: {
        q: next.q ?? filters.q,
        category: next.category ?? filters.category,
        status: next.status ?? filters.status,
        companyId: next.companyId ?? filters.companyId,
        sort: next.sort ?? filters.sort,
        page: next.page ?? 1,
      },
    });
  }

  function clearAll() {
    setQLocal("");
    navigate({
      to: ".",
      search: { q: "", category: "", status: "all", companyId: "", sort: "newest", page: 1 },
    });
  }

  const hasAny =
    filters.q || filters.category || filters.companyId ||
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
            placeholder={t("products.searchPlaceholder")}
            className="ps-9"
            aria-label={t("products.searchPlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select
            value={filters.category || ALL}
            onValueChange={(v) => patch({ category: v === ALL ? "" : v })}
          >
            <SelectTrigger aria-label={t("products.category")}>
              <SelectValue placeholder={t("products.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("products.allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(v) => patch({ status: v as ProductFilters["status"] })}
          >
            <SelectTrigger aria-label={t("products.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("products.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("products.status.active")}</SelectItem>
              <SelectItem value="inactive">{t("products.status.inactive")}</SelectItem>
            </SelectContent>
          </Select>

          {companies.length > 1 && (
            <Select
              value={filters.companyId || ALL}
              onValueChange={(v) => patch({ companyId: v === ALL ? "" : v })}
            >
              <SelectTrigger aria-label={t("products.company")}>
                <SelectValue placeholder={t("products.allCompanies")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("products.allCompanies")}</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={filters.sort}
            onValueChange={(v) => patch({ sort: v as ProductFilters["sort"] })}
          >
            <SelectTrigger aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{t(o.labelKey as never)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("products.total").replace("{count}", String(totalCount))}</span>
        {hasAny && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            {t("products.emptyFilters.action")}
          </Button>
        )}
      </div>
    </section>
  );
}
