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

export function useContactSupplierMutation(onDone?: () => void) {
  const send = useServerFn(contactSupplier);
  const { t } = useI18n();
  return useMutation({
    mutationFn: (input: ContactSupplierInput) => send({ data: input }),
    onSuccess: () => {
      toast.success(t("suppliers.toast.sent"));
      onDone?.();
    },
    onError: (err: Error) => {
      toast.error(mapKnownError(err.message, t) ?? t("suppliers.toast.sendFailed"));
    },
  });
}

export function useUpsertSupplierMutation(onDone?: () => void) {
  const upsert = useServerFn(upsertMySupplierProfile);
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: (input: UpsertSupplierProfileInput) => upsert({ data: input }),
    onSuccess: (res) => {
      toast.success(t("suppliers.toast.saved"));
      qc.invalidateQueries({ queryKey: ["suppliers", "list"] });
      qc.invalidateQueries({ queryKey: ["suppliers", "detail", res.companyId] });
      qc.invalidateQueries({ queryKey: ["suppliers", "mine"] });
      onDone?.();
    },
    onError: (err: Error) => {
      toast.error(mapKnownError(err.message, t) ?? t("suppliers.toast.saveFailed"));
    },
  });
}

function mapKnownError(msg: string, t: (k: string) => string): string | null {
  if (msg.startsWith("suppliers.")) return t(msg);
  return null;
}
