import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCancelOrder } from "@/hooks/use-order-mutations";
import { useI18n } from "@/lib/i18n";
import { MAX_CANCEL_REASON_LEN } from "@/lib/orders/constants";
import type { OrderListItem, OrderRecord } from "@/lib/orders/types";

interface Props {
  order: OrderListItem | OrderRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelOrderDialog({ order, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cancel = useCancelOrder(() => onOpenChange(false));

  useEffect(() => {
    if (open) { setReason(""); setError(null); }
  }, [open]);

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 2) {
      setError(t("orders.error.reasonRequired"));
      return;
    }
    if (!order) return;
    cancel.mutate({ id: order.id, reason: trimmed });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("orders.cancelDialog.title")}</DialogTitle>
          <DialogDescription>{t("orders.cancelDialog.body")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{t("orders.cancelDialog.reason")}</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value.slice(0, MAX_CANCEL_REASON_LEN));
              if (error) setError(null);
            }}
            rows={4}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "cancel-reason-error" : undefined}
          />
          {error ? (
            <p id="cancel-reason-error" className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancel.isPending}>
            {t("orders.cancelDialog.keep")}
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={cancel.isPending || !order}
            className="gap-1.5"
          >
            {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("orders.cancelDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
