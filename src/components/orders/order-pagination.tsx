import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function OrderPagination({
  page, pageSize, total,
}: { page: number; pageSize: number; total: number }) {
  const { t } = useI18n();
  const navigate = useNavigate({ from: "/_app/orders" });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const go = (next: number) =>
    navigate({ to: ".", search: (p) => ({ ...p, page: Math.min(Math.max(1, next), totalPages) }) });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
      <p className="text-xs text-muted-foreground">
        {t("orders.showing")
          .replace("{from}", String(from))
          .replace("{to}", String(to))
          .replace("{total}", String(total))}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm" variant="outline"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="gap-1 h-8"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {t("orders.pagination.previous")}
        </Button>
        <span className="text-xs text-muted-foreground px-2 tabular-nums">
          {t("orders.pagination.pageOf")
            .replace("{page}", String(page))
            .replace("{total}", String(totalPages))}
        </span>
        <Button
          size="sm" variant="outline"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          className="gap-1 h-8"
        >
          {t("orders.pagination.next")} <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
