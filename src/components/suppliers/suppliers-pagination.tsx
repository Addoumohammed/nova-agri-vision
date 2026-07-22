/**
 * Server-side pagination bar for the suppliers directory.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const routeApi = getRouteApi("/_app/suppliers");

interface Props { page: number; pageSize: number; total: number }

export function SuppliersPagination({ page, pageSize, total }: Props) {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  const navigate = routeApi.useNavigate();
  const search = routeApi.useSearch();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const go = (delta: number) => {
    const next = Math.min(totalPages, Math.max(1, page + delta));
    navigate({ to: ".", search: { ...search, page: next } });
  };

  return (
    <nav
      aria-label="Suppliers pagination"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{start}–{end}</span> / {total}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => go(-1)} disabled={page <= 1}>
          <ChevronLeft className="me-1 h-3 w-3" aria-hidden /> {tr("suppliers.pagination.previous")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {tr("suppliers.pagination.pageOf")
            .replace("{page}", String(page))
            .replace("{total}", String(totalPages))}
        </span>
        <Button size="sm" variant="outline" onClick={() => go(1)} disabled={page >= totalPages}>
          {tr("suppliers.pagination.next")} <ChevronRight className="ms-1 h-3 w-3" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
