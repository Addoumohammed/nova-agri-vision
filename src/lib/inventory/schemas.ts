/**
 * Zod schemas shared between client-side form validation and server-fn
 * `inputValidator`s. Both sides enforce identical rules.
 */
import { z } from "zod";
import {
  INVENTORY_PAGE_SIZE,
  INVENTORY_UNITS,
  MAX_ADDRESS_LEN,
  MAX_BARCODE_LEN,
  MAX_REASON_LEN,
  MAX_REFERENCE_LEN,
  MAX_WAREHOUSE_NAME_LEN,
  MOVEMENTS_PAGE_SIZE,
} from "./constants";

const uuid = z.string().uuid();

export const inventorySortSchema = z.enum([
  "newest","oldest","product_asc","product_desc",
  "quantity_asc","quantity_desc","available_asc","available_desc",
]);

export const inventoryStatusFilterSchema = z.enum(["all","in_stock","low","out"]);

export const listInventorySchema = z.object({
  q: z.string().trim().max(120).default(""),
  warehouseId: z.string().trim().max(80).default(""),
  status: inventoryStatusFilterSchema.default("all"),
  sort: inventorySortSchema.default("newest"),
  page: z.number().int().min(1).max(9999).default(1),
  pageSize: z.number().int().min(1).max(100).default(INVENTORY_PAGE_SIZE),
});
export type ListInventoryInput = z.infer<typeof listInventorySchema>;

const quantity = z.coerce.number({ invalid_type_error: "inventory.error.number" })
  .finite()
  .min(0, { message: "inventory.error.nonNegative" })
  .max(1_000_000_000, { message: "inventory.error.tooLarge" });

const positiveDelta = z.coerce.number({ invalid_type_error: "inventory.error.number" })
  .finite()
  .gt(0, { message: "inventory.error.positive" })
  .max(1_000_000_000, { message: "inventory.error.tooLarge" });

const isoCountry = z
  .string().trim()
  .length(2, { message: "inventory.error.country" })
  .transform((s) => s.toUpperCase())
  .optional().or(z.literal(""));

export const warehouseSchema = z.object({
  id: uuid.optional(),
  companyId: uuid,
  name: z.string().trim().min(2, { message: "inventory.error.nameShort" }).max(MAX_WAREHOUSE_NAME_LEN),
  address: z.string().trim().max(MAX_ADDRESS_LEN).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  country: isoCountry,
  capacityMt: z.coerce.number().finite().min(0).max(1_000_000_000).optional().or(z.literal("").transform(() => undefined)),
});
export type WarehouseInput = z.infer<typeof warehouseSchema>;

export const upsertInventorySchema = z.object({
  id: uuid.optional(),
  warehouseId: uuid,
  productId: uuid,
  unit: z.enum(INVENTORY_UNITS),
  quantity,
  reserved: quantity.default(0),
  lowStockThreshold: quantity.default(0),
});
export type UpsertInventoryInput = z.infer<typeof upsertInventorySchema>;

export const adjustStockSchema = z.object({
  inventoryId: uuid,
  mode: z.enum(["in","out","adjust"]),
  quantity: positiveDelta,
  reason: z.string().trim().max(MAX_REASON_LEN).optional().or(z.literal("")),
  reference: z.string().trim().max(MAX_REFERENCE_LEN).optional().or(z.literal("")),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const transferStockSchema = z.object({
  inventoryId: uuid,
  destinationWarehouseId: uuid,
  quantity: positiveDelta,
  reason: z.string().trim().max(MAX_REASON_LEN).optional().or(z.literal("")),
  reference: z.string().trim().max(MAX_REFERENCE_LEN).optional().or(z.literal("")),
});
export type TransferStockInput = z.infer<typeof transferStockSchema>;

export const inventoryIdSchema = z.object({ id: uuid });

export const listMovementsSchema = z.object({
  inventoryId: uuid.optional(),
  warehouseId: uuid.optional(),
  productId: uuid.optional(),
  page: z.number().int().min(1).max(9999).default(1),
  pageSize: z.number().int().min(1).max(100).default(MOVEMENTS_PAGE_SIZE),
});
export type ListMovementsInput = z.infer<typeof listMovementsSchema>;

export const barcodeLookupSchema = z.object({
  barcode: z.string().trim().min(1).max(MAX_BARCODE_LEN),
});
