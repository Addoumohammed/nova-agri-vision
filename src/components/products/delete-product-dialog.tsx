/**
 * Delete-product confirmation dialog. Deliberately blocks the primary action
 * while the mutation is in-flight and closes on success via the hook.
 */
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteProduct } from "@/hooks/use-product-mutations";
import { useI18n } from "@/lib/i18n";
import type { ProductRecord } from "@/lib/products/types";

interface Props {
  product: ProductRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProductDialog({ product, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const mutation = useDeleteProduct(() => onOpenChange(false));

  return (
    <AlertDialog open={open} onOpenChange={(o) => (!mutation.isPending) && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("products.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {product ? `${product.name} — ` : ""}{t("products.deleteConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {t("products.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending || !product}
            onClick={(e) => {
              e.preventDefault();
              if (product) mutation.mutate(product.id);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("products.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
