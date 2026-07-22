/**
 * Stock movement history — side-sheet with paginated ledger for one row.
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeftRight, ArrowUp, Sliders } from "lucide-react";
import { Suspense, useState } from "react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { movementsQueryOptions } from "@/hooks/use-inventory-list";
import { MOVEMENT_TYPE_LABELS, MOVEMENTS_PAGE_SIZE } from "@/lib/inventory/constants";
import { formatQuantity } from "@/lib/inventory/format";
import type { InventoryRecord, StockMovementRecord, StockMovementType } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

function MovementIcon({ type }: { type: StockMovementType }) {
  const cls = "h-4 w-4";
  if (type === "in") return <ArrowDown className={`${cls} text-emerald-500`} />;
  if (type === "out") return <ArrowUp className={`${cls} text-rose-500`} />;
  if (type === "transfer_in" || type === "transfer_out") return <ArrowLeftRight className={cls} />;
  return <Sliders className={cls} />;
}

function MovementItem({ m }: { m: StockMovementRecord }) {
  const { t } = useI18n();
  const label = t(MOVEMENT_TYPE_LABELS[m.movementType] as never);
  const delta = m.newQty - m.previousQty;
  const sign = delta > 0 ? "+" : delta < 0 ? "" : "";
  return (
    <li className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
      <MovementIcon type={m.movementType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{label}</p>
          <span className="text-xs text-muted-foreground tabular-nums">
            {new Date(m.createdAt).toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {m.warehouseName ?? "—"}
          {m.reference ? ` · ${m.reference}` : ""}
        </p>
        <p className="mt-1 text-sm tabular-nums">
          <span className="font-semibold">{sign}{formatQuantity(delta, m.unit)}</span>
          <span className="text-muted-foreground"> · {formatQuantity(m.previousQty, m.unit)} → {formatQuantity(m.newQty, m.unit)}</span>
        </p>
        {m.reason && <p className="mt-1 text-xs text-muted-foreground italic">{m.reason}</p>}
      </div>
    </li>
  );
}

function MovementList({ inventoryId, page }: { inventoryId: string; page: number }) {
  const { data } = useSuspenseQuery(movementsQueryOptions({ inventoryId, page }));
  if (data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No movements yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {data.items.map((m) => <MovementItem key={m.id} m={m} />)}
    </ul>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: InventoryRecord | null;
}

export function StockMovementsSheet({ open, onOpenChange, row }: Props) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("inventory.history")}</SheetTitle>
          <SheetDescription>
            {row ? `${row.productName} · ${row.warehouseName}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {row && (
            <Suspense fallback={
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-xl" />))}
              </div>
            }>
              <MovementList inventoryId={row.id} page={page} />
            </Suspense>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t("inventory.pagination.previous")}
          </Button>
          <span className="tabular-nums">Page {page}</span>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
            {t("inventory.pagination.next")}
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground text-center">{MOVEMENTS_PAGE_SIZE} per page</p>
      </SheetContent>
    </Sheet>
  );
}
