/**
 * Product mutation hooks (create / update / delete / toggle-active).
 * Owns cache invalidation and humanized toast surfaces so route components
 * stay presentation-only.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  createProduct,
  deleteProduct,
  setProductActive,
  updateProduct,
} from "@/lib/products.functions";
import type { CreateProductInput, UpdateProductInput } from "@/lib/products/schemas";

function invalidateProducts(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["products", "mine"] });
}

function humanize(t: (k: string) => string, message: string): string {
  // Server errors that are already i18n keys ("products.error.*") get looked up.
  if (message.startsWith("products.error.")) return t(message);
  return message;
}

export function useCreateProduct(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(createProduct);
  return useMutation({
    mutationFn: (input: CreateProductInput) => fn({ data: input }),
    onSuccess: () => {
      invalidateProducts(qc);
      toast.success(t("products.toast.created"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useUpdateProduct(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(updateProduct);
  return useMutation({
    mutationFn: (input: UpdateProductInput) => fn({ data: input }),
    onSuccess: () => {
      invalidateProducts(qc);
      toast.success(t("products.toast.updated"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useDeleteProduct(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(deleteProduct);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      invalidateProducts(qc);
      toast.success(t("products.toast.deleted"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useToggleProductActive() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(setProductActive);
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => fn({ data: { id, active } }),
    onSuccess: (row) => {
      invalidateProducts(qc);
      toast.success(row.active ? t("products.toast.activated") : t("products.toast.deactivated"));
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}
