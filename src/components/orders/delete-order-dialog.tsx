import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteOrder } from "@/hooks/use-order-mutations";
import { useI18n } from "@/lib/i18n";
import type { OrderListItem } from "@/lib/orders/types";

interface Props {
  order: OrderListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteOrderDialog({ order, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const del = useDeleteOrder(() => onOpenChange(false));

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("orders.deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("orders.deleteDialog.body")}
            {order ? (
              <span className="block mt-2 font-mono text-xs">{order.orderNumber}</span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>
            {t("orders.cancelDialog.keep")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending || !order}
            onClick={(e) => {
              e.preventDefault();
              if (order) del.mutate(order.id);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("orders.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
