/**
 * Transfer stock between warehouses. Source is the inventory row's warehouse;
 * destination must be a different warehouse owned by the caller.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTransferStock } from "@/hooks/use-inventory-mutations";
import { transferStockSchema } from "@/lib/inventory/schemas";
import { formatQuantity } from "@/lib/inventory/format";
import type { InventoryRecord, WarehouseRecord } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: InventoryRecord | null;
  warehouses: WarehouseRecord[];
}

export function TransferStockDialog({ open, onOpenChange, row, warehouses }: Props) {
  const { t } = useI18n();
  const [dest, setDest] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useTransferStock(() => onOpenChange(false));

  useEffect(() => {
    if (open) { setDest(""); setQuantity(""); setReason(""); setReference(""); setError(null); }
  }, [open]);

  if (!row) return null;
  const options = warehouses.filter((w) => w.id !== row.warehouseId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row || mutation.isPending) return;
    const parsed = transferStockSchema.safeParse({
      inventoryId: row.id,
      destinationWarehouseId: dest,
      quantity, reason, reference,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      setError(msg.startsWith("inventory.error.") ? t(msg as never) : msg);
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inventory.transferTitle")}</DialogTitle>
          <DialogDescription>
            {row.productName} — {formatQuantity(row.quantity, row.unit)} @ {row.warehouseName}
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("inventory.noWarehouse.body")}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label>{t("inventory.transferDestination")}</Label>
              <Select value={dest} onValueChange={setDest}>
                <SelectTrigger><SelectValue placeholder={t("inventory.pickProduct")} /></SelectTrigger>
                <SelectContent>
                  {options.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.quantity")} ({row.unit})</Label>
              <Input type="number" inputMode="decimal" min="0" step="0.01" required
                max={row.quantity}
                value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.reason")}</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.reference")}</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                {t("inventory.cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending || !dest || !quantity}>
                {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("inventory.save")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
