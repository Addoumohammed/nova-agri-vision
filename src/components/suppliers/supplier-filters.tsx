/**
 * Supplier filters — search, country, category, sort, min rating, verified.
 * Controlled entirely through TanStack Router search params.
 */
import { Filter, Search, ShieldCheck, Star, X } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPLIER_CATEGORIES, SUPPLIER_SORT_OPTIONS } from "@/lib/suppliers/constants";
import type { SupplierFilters } from "@/lib/suppliers/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const routeApi = getRouteApi("/_app/suppliers");

interface Props {
  filters: SupplierFilters;
  totalCount: number;
  countries: string[];
}

export function SupplierFiltersBar({ filters, totalCount, countries }: Props) {
  const { t } = useI18n();
  const navigate = routeApi.useNavigate();
  const [qLocal, setQLocal] = useState(filters.q);

  useEffect(() => setQLocal(filters.q), [filters.q]);

  useEffect(() => {
    const trimmed = qLocal.trim();
    if (trimmed === filters.q) return;
    const id = window.setTimeout(() => {
      navigate({ to: ".", search: { ...serialize(filters), q: trimmed, page: 1 } });
    }, 250);
    return () => window.clearTimeout(id);
  }, [qLocal, filters, navigate]);

  const setSearch = (patch: Partial<SupplierFilters>) =>
    navigate({ to: ".", search: { ...serialize(filters), ...patch, page: 1 } });

  const clearAll = () => {
    setQLocal("");
    navigate({
      to: ".",
      search: { q: "", country: "", category: "", verifiedOnly: false, minRating: 0, sort: "newest", page: 1 },
    });
  };

  const hasAny =
    filters.q || filters.country || filters.category ||
    filters.verifiedOnly || filters.minRating > 0 || filters.sort !== "newest";

  const tr = t as unknown as (k: string) => string;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-elegant">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            placeholder={tr("suppliers.search.placeholder")}
            className="ps-9"
            aria-label={tr("suppliers.search.placeholder")}
          />
        </div>
        <Select
          value={filters.country || "__all__"}
          onValueChange={(v) => setSearch({ country: v === "__all__" ? "" : v })}
        >
          <SelectTrigger className="min-w-[160px]" aria-label={tr("suppliers.filter.country")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">🌍 {tr("suppliers.filter.allCountries")}</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category || "__all__"}
          onValueChange={(v) => setSearch({ category: v === "__all__" ? "" : v })}
        >
          <SelectTrigger className="min-w-[160px]" aria-label={tr("suppliers.filter.category")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{tr("suppliers.filter.allCategories")}</SelectItem>
            {SUPPLIER_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.sort}
          onValueChange={(v) => setSearch({ sort: v as SupplierFilters["sort"] })}
        >
          <SelectTrigger className="min-w-[180px]" aria-label={tr("suppliers.filter.sort")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPLIER_SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{tr(o.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Filter className="h-3 w-3" aria-hidden />
          {tr("suppliers.filter.minRating")}
        </span>
        {[0, 3, 3.5, 4, 4.5].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSearch({ minRating: r })}
            aria-pressed={filters.minRating === r}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition",
              filters.minRating === r
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent",
            )}
          >
            {r === 0 ? "Any" : (<><Star className="h-3 w-3" aria-hidden /> {r}+</>)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSearch({ verifiedOnly: !filters.verifiedOnly })}
          aria-pressed={filters.verifiedOnly}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition",
            filters.verifiedOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-accent",
          )}
        >
          <ShieldCheck className="h-3 w-3" aria-hidden /> {tr("suppliers.filter.verifiedOnly")}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{tr("suppliers.filter.results").replace("{count}", String(totalCount))}</span>
        {hasAny && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 gap-1 px-2 text-xs">
            <X className="h-3 w-3" aria-hidden /> {tr("suppliers.filter.clear")}
          </Button>
        )}
      </div>
    </section>
  );
}

function serialize(f: SupplierFilters) {
  return {
    q: f.q, country: f.country, category: f.category,
    verifiedOnly: f.verifiedOnly, minRating: f.minRating,
    sort: f.sort, page: f.page,
  };
}
