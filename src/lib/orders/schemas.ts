/**
 * Zod schemas — shared between the create/edit form (client) and server-fn
 * `inputValidator`s so validation is enforced identically on both sides.
 */
import { z } from "zod";
import {
  MAX_CANCEL_REASON_LEN,
  MAX_INCOTERMS_LEN,
  MAX_ITEMS_PER_ORDER,
  MAX_NOTES_LEN,
  ORDERS_PAGE_SIZE,
  ORDER_STATUSES,
} from "./constants";

const uuid = z.string().uuid();

// The Postgres check constraint enforces qty > 0; unit price >= 0. Mirror that.
const money = z.coerce
  .number({ invalid_type_error: "orders.error.unitPrice" })
  .finite()
  .min(0, { message: "orders.error.unitPrice" })
  .max(1_000_000_000, { message: "orders.error.unitPrice" });

const positiveQty = z.coerce
  .number({ invalid_type_error: "orders.error.quantity" })
  .finite()
  .gt(0, { message: "orders.error.quantity" })
  .max(1_000_000_000, { message: "orders.error.quantity" });

const pct = z.coerce
  .number({ invalid_type_error: "orders.error.pct" })
  .finite()
  .min(0, { message: "orders.error.pct" })
  .max(100, { message: "orders.error.pct" });

export const orderItemInputSchema = z.object({
  productId: uuid.optional().or(z.literal("")),
  name: z.string().trim().min(1, { message: "orders.error.itemName" }).max(200),
  quantity: positiveQty,
  unit: z.string().trim().min(1).max(16),
  unitPriceUsd: money,
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const orderSortSchema = z.enum([
  "newest",
  "oldest",
  "total_desc",
  "total_asc",
  "eta_asc",
  "eta_desc",
]);

export const orderStatusFilterSchema = z.enum([
  "all",
  ...ORDER_STATUSES,
] as [string, ...string[]]);

export const orderRoleFilterSchema = z.enum(["all", "buyer", "supplier"]);

export const listOrdersSchema = z.object({
  q: z.string().trim().max(120).default(""),
  status: orderStatusFilterSchema.default("all"),
  role: orderRoleFilterSchema.default("all"),
  sort: orderSortSchema.default("newest"),
  page: z.number().int().min(1).max(9999).default(1),
  pageSize: z.number().int().min(1).max(100).default(ORDERS_PAGE_SIZE),
});
export type ListOrdersInput = z.infer<typeof listOrdersSchema>;

export const orderIdSchema = z.object({ id: uuid });

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "orders.error.eta" })
  .optional()
  .or(z.literal(""));

const notes = z.string().trim().max(MAX_NOTES_LEN).optional().or(z.literal(""));
const incoterms = z.string().trim().max(MAX_INCOTERMS_LEN).optional().or(z.literal(""));

export const createOrderSchema = z
  .object({
    buyerCompanyId: uuid,
    supplierCompanyId: uuid,
    incoterms,
    notes,
    eta: isoDate,
    discountPct: pct.default(0),
    taxPct: pct.default(0),
    items: z
      .array(orderItemInputSchema)
      .min(1, { message: "orders.error.itemsRequired" })
      .max(MAX_ITEMS_PER_ORDER, { message: "orders.error.itemsRequired" }),
    submit: z.boolean().default(false),
  })
  .refine((v) => v.buyerCompanyId !== v.supplierCompanyId, {
    message: "orders.error.sameCompany",
    path: ["supplierCompanyId"],
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z
  .object({
    id: uuid,
    incoterms,
    notes,
    eta: isoDate,
    discountPct: pct.default(0),
    taxPct: pct.default(0),
    items: z
      .array(orderItemInputSchema)
      .min(1, { message: "orders.error.itemsRequired" })
      .max(MAX_ITEMS_PER_ORDER, { message: "orders.error.itemsRequired" }),
  });
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const setOrderStatusSchema = z.object({
  id: uuid,
  status: z.enum(ORDER_STATUSES as unknown as [string, ...string[]]),
  reason: z.string().trim().max(MAX_CANCEL_REASON_LEN).optional().or(z.literal("")),
});
export type SetOrderStatusInput = z.infer<typeof setOrderStatusSchema>;

export const cancelOrderSchema = z.object({
  id: uuid,
  reason: z.string().trim().min(2, { message: "orders.error.reasonRequired" }).max(MAX_CANCEL_REASON_LEN),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
