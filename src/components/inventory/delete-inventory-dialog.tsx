/**
 * Delete inventory row confirmation. Movements ledger is preserved server-side.
 */
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteInventory } from "@/hooks/use-inventory-mutations";
import type { InventoryRecord } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  row: InventoryRecord | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function DeleteInventoryDialog({ row, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const del = useDeleteInventory(() => onOpenChange(false));
  return (
    <AlertDialog open={open} onOpenChange={(o) => !del.isPending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("inventory.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {row ? `${row.productName} — ${row.warehouseName}. ` : ""}
            {t("inventory.deleteConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>{t("inventory.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending || !row}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => { e.preventDefault(); if (row) del.mutate(row.id); }}
          >
            {del.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("inventory.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
