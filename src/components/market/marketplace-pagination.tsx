/**
 * Marketplace pagination bar — server-side. Updates the URL page param via
 * the router so results survive refreshes / share links.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  pageSize: number;
  total: number;
}

export function MarketPagination({ page, pageSize, total }: Props) {
  const navigate = useNavigate({ from: "/_app/market" });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function go(delta: number) {
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        page: Math.min(totalPages, Math.max(1, (prev.page ?? 1) + delta)),
      }),
    });
  }

  return (
    <nav
      aria-label="Marketplace pagination"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => go(-1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="me-1 h-3 w-3" aria-hidden /> Prev
        </Button>
        <span className="text-xs text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span> / {totalPages}
        </span>
        <Button size="sm" variant="outline" onClick={() => go(1)} disabled={page >= totalPages} aria-label="Next page">
          Next <ChevronRight className="ms-1 h-3 w-3" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
