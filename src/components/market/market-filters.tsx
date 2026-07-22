/**
 * Marketplace filters — search + categories + country + sort. Controlled via
 * TanStack Router search-param updates so state is bookmarkable / shareable.
 */
import { Filter, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORIGIN_COUNTRIES, SORT_OPTIONS } from "@/lib/marketplace/constants";
import type { MarketplaceCategory, MarketplaceFilters } from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

const routeApi = getRouteApi("/_app/market");

interface Props {
  filters: MarketplaceFilters;
  categories: MarketplaceCategory[];
  totalCount: number;
}

export function MarketFilters({ filters, categories, totalCount }: Props) {
  const navigate = routeApi.useNavigate();
  const [qLocal, setQLocal] = useState(filters.q);

  // Keep local input in sync when filters are reset externally.
  useEffect(() => setQLocal(filters.q), [filters.q]);

  // Debounce search to keep URL updates ergonomic.
  useEffect(() => {
    const trimmed = qLocal.trim();
    if (trimmed === filters.q) return;
    const t = window.setTimeout(() => {
      navigate({ to: ".", search: (prev) => ({ ...prev, q: trimmed, page: 1 }) });
    }, 250);
    return () => window.clearTimeout(t);
  }, [qLocal, filters.q, navigate]);

  function updateCategory(slug: string) {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, category: prev.category === slug ? "" : slug, page: 1 }),
    });
  }
  function updateCountry(iso: string) {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, country: iso === "__all__" ? "" : iso, page: 1 }),
    });
  }
  function updateSort(sort: string) {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, sort: sort as MarketplaceFilters["sort"], page: 1 }),
    });
  }
  function clearAll() {
    setQLocal("");
    navigate({ to: ".", search: () => ({ q: "", category: "", country: "", sort: "relevance", page: 1 }) });
  }

  const hasAny = filters.q || filters.category || filters.country || filters.sort !== "relevance";

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-elegant">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            placeholder="Search products, SKU, description…"
            aria-label="Search products"
            className="ps-9"
          />
        </div>
        <Select value={filters.country || "__all__"} onValueChange={updateCountry}>
          <SelectTrigger className="min-w-[160px]" aria-label="Filter by country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">🌍 All origins</SelectItem>
            {ORIGIN_COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>{c.flag} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={updateSort}>
          <SelectTrigger className="min-w-[160px]" aria-label="Sort products">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{sortLabel(o.value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" aria-hidden /> Category
        </div>
        <CategoryChip
          active={filters.category === ""}
          onClick={() => updateCategory(filters.category)}
          label="All"
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            active={filters.category === c.slug}
            onClick={() => updateCategory(c.slug)}
            label={`${c.name}${c.productCount ? ` · ${c.productCount}` : ""}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {totalCount} product{totalCount === 1 ? "" : "s"} match
        </div>
        {hasAny && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 gap-1 px-2 text-xs">
            <X className="h-3 w-3" aria-hidden /> Clear filters
          </Button>
        )}
      </div>
    </section>
  );
}

function CategoryChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function sortLabel(value: string): string {
  switch (value) {
    case "relevance":  return "Most relevant";
    case "newest":     return "Newest";
    case "price_asc":  return "Price · low to high";
    case "price_desc": return "Price · high to low";
    case "stock":      return "Best stocked";
    default:           return value;
  }
}
