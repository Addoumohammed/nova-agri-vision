/**
 * Warehouses management dialog — list + create / edit / delete.
 * Kept in a single sheet so it's one flow for operators.
 */
import { Loader2, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WarehouseFormDialog } from "./warehouse-form-dialog";
import { useDeleteWarehouse } from "@/hooks/use-inventory-mutations";
import { formatCompact } from "@/lib/inventory/format";
import type { WarehouseRecord } from "@/lib/inventory/types";
import type { OwnedCompany } from "@/lib/products/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  warehouses: WarehouseRecord[];
  companies: OwnedCompany[];
}

export function WarehousesSheet({ open, onOpenChange, warehouses, companies }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<WarehouseRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<WarehouseRecord | null>(null);
  const del = useDeleteWarehouse(() => setDeleting(null));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("inventory.warehouses")}</SheetTitle>
          <SheetDescription>{t("inventory.subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />{t("inventory.newWarehouse")}
          </Button>
        </div>

        <ul className="mt-4 space-y-2">
          {warehouses.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("inventory.noWarehouse.body")}
            </li>
          )}
          {warehouses.map((w) => (
            <li key={w.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <WarehouseIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{w.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[w.city, w.country].filter(Boolean).join(", ") || "—"}
                    {w.capacityMt != null ? ` · ${formatCompact(w.capacityMt, "MT")} cap` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.itemsCount} items · {formatCompact(w.totalQuantity, "u")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(w)} aria-label={t("inventory.editWarehouse")}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive"
                    onClick={() => setDeleting(w)} aria-label={t("inventory.delete")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <WarehouseFormDialog open={creating} onOpenChange={setCreating} companies={companies} />
        <WarehouseFormDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}
          warehouse={editing} companies={companies} />

        <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && !del.isPending && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("inventory.deleteWarehouseTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleting ? `${deleting.name} — ` : ""}{t("inventory.deleteWarehouseConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={del.isPending}>{t("inventory.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={del.isPending || !deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => { e.preventDefault(); if (deleting) del.mutate(deleting.id); }}
              >
                {del.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("inventory.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
