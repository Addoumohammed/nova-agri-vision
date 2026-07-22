/**
 * Farm filters bar — search, country, crop, status, sort.
 * URL-synced via TanStack Router.
 */
import { Filter, Search, X } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FarmFilters } from "@/lib/farms/types";
import { FARM_STATUSES } from "@/lib/farms/constants";
import { cn } from "@/lib/utils";

const routeApi = getRouteApi("/_app/farms");

const SORT_OPTIONS: { value: FarmFilters["sort"]; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "area_desc", label: "Largest area" },
  { value: "area_asc", label: "Smallest area" },
];

interface Props {
  filters: FarmFilters;
  totalCount: number;
  countries: string[];
  crops: string[];
}

export function FarmFiltersBar({ filters, totalCount, countries, crops }: Props) {
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

  const setSearch = (patch: Partial<FarmFilters>) =>
    navigate({ to: ".", search: { ...serialize(filters), ...patch, page: 1 } });

  const clearAll = () => {
    setQLocal("");
    navigate({ to: ".", search: { q: "", country: "", crop: "", status: "", sort: "newest", page: 1 } });
  };

  const hasAny = filters.q || filters.country || filters.crop || filters.status || filters.sort !== "newest";

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-elegant">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            placeholder="Search farms by name…"
            className="ps-9"
            aria-label="Search farms"
          />
        </div>
        <Select value={filters.country || "__all__"} onValueChange={(v) => setSearch({ country: v === "__all__" ? "" : v })}>
          <SelectTrigger className="min-w-[140px]" aria-label="Country"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">🌍 All countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.crop || "__all__"} onValueChange={(v) => setSearch({ crop: v === "__all__" ? "" : v })}>
          <SelectTrigger className="min-w-[140px]" aria-label="Crop"><SelectValue placeholder="Crop" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All crops</SelectItem>
            {crops.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status || "__all__"} onValueChange={(v) => setSearch({ status: (v === "__all__" ? "" : v) as FarmFilters["status"] })}>
          <SelectTrigger className="min-w-[130px]" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {FARM_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(v) => setSearch({ sort: v as FarmFilters["sort"] })}>
          <SelectTrigger className="min-w-[160px]" aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("flex items-center justify-between text-xs text-muted-foreground")}>
        <span className="inline-flex items-center gap-1.5">
          <Filter className="h-3 w-3" aria-hidden />
          Showing {totalCount} {totalCount === 1 ? "farm" : "farms"}
        </span>
        {hasAny && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 gap-1 px-2 text-xs">
            <X className="h-3 w-3" aria-hidden /> Clear
          </Button>
        )}
      </div>
    </section>
  );
}

function serialize(f: FarmFilters) {
  return { q: f.q, country: f.country, crop: f.crop, status: f.status, sort: f.sort, page: f.page };
}
