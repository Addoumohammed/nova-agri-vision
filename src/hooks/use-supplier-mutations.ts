/**
 * Mutations for the Suppliers module: contact + profile upsert.
 * Handles cache invalidation, toasts and error normalization.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { contactSupplier, upsertMySupplierProfile } from "@/lib/suppliers.functions";
import type {
  ContactSupplierInput,
  UpsertSupplierProfileInput,
} from "@/lib/suppliers/schemas";
import { useI18n } from "@/lib/i18n";

// Server errors we throw are translation keys (e.g. "suppliers.error.notOwner").
// Cast is safe because the i18n `t` accepts the union of literal keys.
type TranslateFn = (k: string) => string;

export function useContactSupplierMutation(onDone?: () => void) {
  const send = useServerFn(contactSupplier);
  const { t } = useI18n();
  const tr = t as unknown as TranslateFn;
  return useMutation({
    mutationFn: (input: ContactSupplierInput) => send({ data: input }),
    onSuccess: () => {
      toast.success(tr("suppliers.toast.sent"));
      onDone?.();
    },
    onError: (err: Error) => {
      toast.error(translateError(err.message, tr) ?? tr("suppliers.toast.sendFailed"));
    },
  });
}

export function useUpsertSupplierMutation(onDone?: () => void) {
  const upsert = useServerFn(upsertMySupplierProfile);
  const qc = useQueryClient();
  const { t } = useI18n();
  const tr = t as unknown as TranslateFn;
  return useMutation({
    mutationFn: (input: UpsertSupplierProfileInput) => upsert({ data: input }),
    onSuccess: (res) => {
      toast.success(tr("suppliers.toast.saved"));
      qc.invalidateQueries({ queryKey: ["suppliers", "list"] });
      qc.invalidateQueries({ queryKey: ["suppliers", "detail", res.companyId] });
      qc.invalidateQueries({ queryKey: ["suppliers", "mine"] });
      onDone?.();
    },
    onError: (err: Error) => {
      toast.error(translateError(err.message, tr) ?? tr("suppliers.toast.saveFailed"));
    },
  });
}

function translateError(msg: string, tr: TranslateFn): string | null {
  if (msg.startsWith("suppliers.")) return tr(msg);
  return null;
}
