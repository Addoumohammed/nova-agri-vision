/**
 * Orders module constants — page size, status metadata, allowed transitions,
 * and the tiny state machine that gates status changes on both sides.
 */
import type { OrderRole, OrderSort, OrderStatus } from "./types";

export const ORDERS_PAGE_SIZE = 15;

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "draft",
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const ORDER_STATUS_LABEL_KEYS: Record<OrderStatus, string> = {
  draft: "orders.status.draft",
  pending: "orders.status.pending",
  confirmed: "orders.status.confirmed",
  shipped: "orders.status.shipped",
  delivered: "orders.status.delivered",
  cancelled: "orders.status.cancelled",
};

export const ORDER_SORT_OPTIONS: ReadonlyArray<{ value: OrderSort; labelKey: string }> = [
  { value: "newest",     labelKey: "orders.sort.newest" },
  { value: "oldest",     labelKey: "orders.sort.oldest" },
  { value: "total_desc", labelKey: "orders.sort.totalDesc" },
  { value: "total_asc",  labelKey: "orders.sort.totalAsc" },
  { value: "eta_asc",    labelKey: "orders.sort.etaAsc" },
  { value: "eta_desc",   labelKey: "orders.sort.etaDesc" },
] as const;

/**
 * Status transition matrix. Buyer + supplier + admin can each move an order
 * forward along the allowed paths. Cancellation is allowed up to `shipped`.
 * `delivered` and `cancelled` are terminal.
 */
type TransitionMap = Partial<Record<OrderRole | "admin", readonly OrderStatus[]>>;

export const ORDER_TRANSITIONS: Record<OrderStatus, TransitionMap> = {
  draft:     { buyer: ["pending", "cancelled"], admin: ["pending", "cancelled"] },
  pending:   {
    buyer:    ["cancelled"],
    supplier: ["confirmed", "cancelled"],
    admin:    ["confirmed", "cancelled"],
  },
  confirmed: {
    supplier: ["shipped", "cancelled"],
    admin:    ["shipped", "cancelled"],
  },
  shipped:   { supplier: ["delivered"], buyer: ["delivered"], admin: ["delivered"] },
  delivered: {},
  cancelled: {},
};

export function allowedTransitions(
  status: OrderStatus,
  callerRole: OrderRole | "admin",
): readonly OrderStatus[] {
  const forRole = ORDER_TRANSITIONS[status][callerRole] ?? [];
  return forRole;
}

export const MAX_ITEMS_PER_ORDER = 50;
export const MAX_NOTES_LEN = 4000;
export const MAX_INCOTERMS_LEN = 12;
export const MAX_CANCEL_REASON_LEN = 500;
