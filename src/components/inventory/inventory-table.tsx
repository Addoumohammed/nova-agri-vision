/**
 * Inventory table — responsive (table on md+, cards on mobile). Actions:
 * edit row, adjust stock, transfer, history, delete.
 */
import { AlertTriangle, ArrowLeftRight, History, MoreVertical, Pencil, Sliders, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatQuantity } from "@/lib/inventory/format";
import type { InventoryRecord } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  rows: InventoryRecord[];
  onEdit: (r: InventoryRecord) => void;
  onAdjust: (r: InventoryRecord) => void;
  onTransfer: (r: InventoryRecord) => void;
  onHistory: (r: InventoryRecord) => void;
  onDelete: (r: InventoryRecord) => void;
}

function StatusBadge({ row }: { row: InventoryRecord }) {
  const { t } = useI18n();
  if (row.status === "out") {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t("inventory.status.out")}</Badge>;
  }
  if (row.status === "low") {
    return <Badge className="gap-1 bg-amber-500/15 text-amber-500 border-amber-500/30" variant="outline"><AlertTriangle className="h-3 w-3" />{t("inventory.status.low")}</Badge>;
  }
  return <Badge variant="secondary">{t("inventory.status.ok")}</Badge>;
}

function RowActions({ row, onEdit, onAdjust, onTransfer, onHistory, onDelete }: {
  row: InventoryRecord;
  onEdit: (r: InventoryRecord) => void;
  onAdjust: (r: InventoryRecord) => void;
  onTransfer: (r: InventoryRecord) => void;
  onHistory: (r: InventoryRecord) => void;
  onDelete: (r: InventoryRecord) => void;
}) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("inventory.actions")}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAdjust(row)}>
          <Sliders className="me-2 h-4 w-4" />{t("inventory.adjust")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTransfer(row)}>
          <ArrowLeftRight className="me-2 h-4 w-4" />{t("inventory.transfer")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onHistory(row)}>
          <History className="me-2 h-4 w-4" />{t("inventory.history")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(row)}>
          <Pencil className="me-2 h-4 w-4" />{t("inventory.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="me-2 h-4 w-4" />{t("inventory.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InventoryTable(props: Props) {
  const { t } = useI18n();
  const { rows } = props;
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("inventory.product")}</TableHead>
              <TableHead>{t("inventory.warehouse")}</TableHead>
              <TableHead className="text-end">{t("inventory.quantity")}</TableHead>
              <TableHead className="text-end">{t("inventory.reserved")}</TableHead>
              <TableHead className="text-end">{t("inventory.available")}</TableHead>
              <TableHead>{t("inventory.status")}</TableHead>
              <TableHead className="w-14 text-end sr-only">{t("inventory.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.productName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.productSku ?? "—"}
                      {r.productBarcode ? ` · ${r.productBarcode}` : ""}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.warehouseName}</TableCell>
                <TableCell className="text-end tabular-nums">{formatQuantity(r.quantity, r.unit)}</TableCell>
                <TableCell className="text-end tabular-nums text-muted-foreground">{formatQuantity(r.reserved, r.unit)}</TableCell>
                <TableCell className={cn("text-end tabular-nums font-semibold",
                  r.status === "out" && "text-destructive",
                  r.status === "low" && "text-amber-500",
                )}>{formatQuantity(r.available, r.unit)}</TableCell>
                <TableCell><StatusBadge row={r} /></TableCell>
                <TableCell className="text-end"><RowActions row={r} {...props} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-elegant">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.productName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {r.warehouseName} · {r.productSku ?? "—"}
                </p>
              </div>
              <RowActions row={r} {...props} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">{t("inventory.quantity")}</p>
                <p className="font-medium tabular-nums">{formatQuantity(r.quantity, r.unit)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("inventory.available")}</p>
                <p className={cn("font-medium tabular-nums",
                  r.status === "out" && "text-destructive",
                  r.status === "low" && "text-amber-500",
                )}>{formatQuantity(r.available, r.unit)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("inventory.status")}</p>
                <StatusBadge row={r} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
