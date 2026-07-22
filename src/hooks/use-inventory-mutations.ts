/**
 * Inventory mutation hooks — cache invalidation and humanized toasts so
 * route components stay presentation-only.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  adjustStock,
  deleteInventoryRow,
  deleteWarehouse,
  transferStock,
  upsertInventory,
  upsertWarehouse,
} from "@/lib/inventory.functions";
import type {
  AdjustStockInput,
  TransferStockInput,
  UpsertInventoryInput,
  WarehouseInput,
} from "@/lib/inventory/schemas";

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["inventory"] });
}

type T = ReturnType<typeof useI18n>["t"];

function humanize(t: T, message: string): string {
  if (message.startsWith("inventory.error.")) return t(message as Parameters<T>[0]);
  return message;
}

export function useUpsertWarehouse(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(upsertWarehouse);
  return useMutation({
    mutationFn: (input: WarehouseInput) => fn({ data: input }),
    onSuccess: () => {
      invalidate(qc);
      toast.success(t("inventory.toast.warehouseSaved"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useDeleteWarehouse(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(deleteWarehouse);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      invalidate(qc);
      toast.success(t("inventory.toast.warehouseDeleted"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useUpsertInventory(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(upsertInventory);
  return useMutation({
    mutationFn: (input: UpsertInventoryInput) => fn({ data: input }),
    onSuccess: () => {
      invalidate(qc);
      toast.success(t("inventory.toast.saved"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useAdjustStock(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(adjustStock);
  return useMutation({
    mutationFn: (input: AdjustStockInput) => fn({ data: input }),
    onSuccess: () => {
      invalidate(qc);
      toast.success(t("inventory.toast.adjusted"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useTransferStock(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(transferStock);
  return useMutation({
    mutationFn: (input: TransferStockInput) => fn({ data: input }),
    onSuccess: () => {
      invalidate(qc);
      toast.success(t("inventory.toast.transferred"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useDeleteInventory(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(deleteInventoryRow);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      invalidate(qc);
      toast.success(t("inventory.toast.deleted"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}
