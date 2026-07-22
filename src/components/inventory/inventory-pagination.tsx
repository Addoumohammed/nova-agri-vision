/**
 * URL-synced pagination for the Inventory table.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const routeApi = getRouteApi("/_app/inventory");

interface Props { page: number; pageSize: number; total: number; }

export function InventoryPagination({ page, pageSize, total }: Props) {
  const { t } = useI18n();
  const navigate = routeApi.useNavigate();
  const search = routeApi.useSearch();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function go(delta: number) {
    const nextPage = Math.min(totalPages, Math.max(1, page + delta));
    navigate({
      to: ".",
      search: {
        q: search.q,
        warehouseId: search.warehouseId,
        status: search.status,
        sort: search.sort,
        page: nextPage,
      },
    });
  }

  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
      <p className="text-muted-foreground">
        {t("inventory.showing")
          .replace("{from}", String(start))
          .replace("{to}", String(end))
          .replace("{total}", String(total))}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={page <= 1}
          aria-label={t("inventory.pagination.previous")} className="gap-1.5">
          <PrevIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{t("inventory.pagination.previous")}</span>
        </Button>
        <span className="text-muted-foreground tabular-nums" aria-live="polite">
          {t("inventory.pagination.pageOf")
            .replace("{page}", String(page))
            .replace("{total}", String(totalPages))}
        </span>
        <Button variant="outline" size="sm" onClick={() => go(1)} disabled={page >= totalPages}
          aria-label={t("inventory.pagination.next")} className="gap-1.5">
          <span className="hidden sm:inline">{t("inventory.pagination.next")}</span>
          <NextIcon className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
