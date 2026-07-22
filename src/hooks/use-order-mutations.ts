/**
 * Order mutation hooks (create / update / status / cancel / delete).
 * Owns cache invalidation and humanized toast surfaces so route components
 * stay presentation-only.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  cancelOrder,
  createOrder,
  deleteOrder,
  setOrderStatus,
  updateOrder,
} from "@/lib/orders.functions";
import type {
  CancelOrderInput,
  CreateOrderInput,
  SetOrderStatusInput,
  UpdateOrderInput,
} from "@/lib/orders/schemas";
import type { OrderRecord } from "@/lib/orders/types";

type T = ReturnType<typeof useI18n>["t"];

function humanize(t: T, message: string): string {
  if (message.startsWith("orders.error.")) return t(message as Parameters<T>[0]);
  return message;
}

function invalidateOrders(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: ["orders", "list"] });
  if (id) {
    void qc.invalidateQueries({ queryKey: ["orders", "detail", id] });
    void qc.invalidateQueries({ queryKey: ["orders", "timeline", id] });
  }
}

export function useCreateOrder(onDone?: (order: OrderRecord) => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(createOrder);
  return useMutation({
    mutationFn: (input: CreateOrderInput) => fn({ data: input }),
    onSuccess: (order) => {
      invalidateOrders(qc, order.id);
      toast.success(order.status === "draft" ? t("orders.toast.draftSaved") : t("orders.toast.submitted"));
      onDone?.(order);
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useUpdateOrder(onDone?: (order: OrderRecord) => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(updateOrder);
  return useMutation({
    mutationFn: (input: UpdateOrderInput) => fn({ data: input }),
    onSuccess: (order) => {
      invalidateOrders(qc, order.id);
      toast.success(t("orders.toast.updated"));
      onDone?.(order);
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useSetOrderStatus(onDone?: (order: OrderRecord) => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(setOrderStatus);
  return useMutation({
    mutationFn: (input: SetOrderStatusInput) => fn({ data: input }),
    onSuccess: (order) => {
      invalidateOrders(qc, order.id);
      toast.success(t("orders.toast.statusChanged"));
      onDone?.(order);
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useCancelOrder(onDone?: (order: OrderRecord) => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(cancelOrder);
  return useMutation({
    mutationFn: (input: CancelOrderInput) => fn({ data: input }),
    onSuccess: (order) => {
      invalidateOrders(qc, order.id);
      toast.success(t("orders.toast.cancelled"));
      onDone?.(order);
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}

export function useDeleteOrder(onDone?: () => void) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fn = useServerFn(deleteOrder);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: (res) => {
      invalidateOrders(qc, res.id);
      toast.success(t("orders.toast.deleted"));
      onDone?.();
    },
    onError: (e: Error) => toast.error(humanize(t, e.message)),
  });
}
