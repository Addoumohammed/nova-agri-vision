/**
 * Adjust stock dialog — in / out / set-exact with reason + reference.
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
import { useAdjustStock } from "@/hooks/use-inventory-mutations";
import { adjustStockSchema } from "@/lib/inventory/schemas";
import { formatQuantity } from "@/lib/inventory/format";
import type { InventoryRecord } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: InventoryRecord | null;
}

type Mode = "in" | "out" | "adjust";

export function AdjustStockDialog({ open, onOpenChange, row }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdjustStock(() => onOpenChange(false));

  useEffect(() => {
    if (open) {
      setMode("in"); setQuantity(""); setReason(""); setReference(""); setError(null);
    }
  }, [open]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row || mutation.isPending) return;
    const parsed = adjustStockSchema.safeParse({
      inventoryId: row.id,
      mode, quantity, reason, reference,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      setError(msg.startsWith("inventory.error.") ? t(msg as never) : msg);
      return;
    }
    mutation.mutate(parsed.data);
  }

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inventory.adjust")}</DialogTitle>
          <DialogDescription>
            {row.productName} · {row.warehouseName} — {formatQuantity(row.quantity, row.unit)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>{t("inventory.adjust")}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">{t("inventory.adjustMode.in")}</SelectItem>
                <SelectItem value="out">{t("inventory.adjustMode.out")}</SelectItem>
                <SelectItem value="adjust">{t("inventory.adjustMode.adjust")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("inventory.quantity")} ({row.unit})</Label>
            <Input type="number" inputMode="decimal" min="0" step="0.01" required
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
            <Button type="submit" disabled={mutation.isPending || !quantity}>
              {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("inventory.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
