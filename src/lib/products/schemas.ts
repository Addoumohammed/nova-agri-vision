/**
 * Zod schemas — shared between client-side form validation and server-fn
 * `inputValidator`s so both sides enforce identical, auditable rules.
 */
import { z } from "zod";
import {
  MAX_DESC_LEN,
  MAX_IMAGES,
  MAX_NAME_LEN,
  MAX_SKU_LEN,
  PRODUCTS_PAGE_SIZE,
  PRODUCT_UNITS,
} from "./constants";

const uuid = z.string().uuid();

export const productSortSchema = z.enum([
  "newest", "oldest", "name_asc", "name_desc",
  "price_asc", "price_desc", "stock_asc", "stock_desc",
]);

export const productStatusFilterSchema = z.enum(["all", "active", "inactive"]);

export const listProductsSchema = z.object({
  q: z.string().trim().max(120).default(""),
  category: z.string().trim().max(80).default(""),
  status: productStatusFilterSchema.default("all"),
  companyId: z.string().trim().max(80).default(""),
  sort: productSortSchema.default("newest"),
  page: z.number().int().min(1).max(9999).default(1),
  pageSize: z.number().int().min(1).max(100).default(PRODUCTS_PAGE_SIZE),
});

export type ListProductsInput = z.infer<typeof listProductsSchema>;

export const productIdSchema = z.object({ id: uuid });

/**
 * Image URL — must be http(s) and length-bounded to fit inside `text[]`
 * without runaway payloads. We do NOT enforce a specific host so users can
 * paste CDN, storage or third-party URLs.
 */
const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .url({ message: "products.error.imageUrl" });

export const productImagesSchema = z
  .array(imageUrl)
  .max(MAX_IMAGES, { message: "products.error.tooManyImages" })
  .default([]);

/**
 * SKU rule: nullable, alphanumeric with `-`, `_`, `.` and `/`, trimmed and
 * uppercased so `sku` uniqueness (supplier_company_id, sku) is deterministic.
 */
const sku = z
  .string()
  .trim()
  .max(MAX_SKU_LEN)
  .regex(/^[A-Za-z0-9._/-]*$/, { message: "products.error.sku" })
  .transform((s) => (s ? s.toUpperCase() : ""))
  .optional();

const isoCountry = z
  .string()
  .trim()
  .length(2, { message: "products.error.country" })
  .transform((s) => s.toUpperCase())
  .optional()
  .or(z.literal(""));

const positiveMoney = z.coerce
  .number({ invalid_type_error: "products.error.number" })
  .finite()
  .min(0, { message: "products.error.nonNegative" })
  .max(1_000_000_000, { message: "products.error.tooLarge" });

export const createProductSchema = z.object({
  companyId: uuid,
  name: z.string().trim().min(2, { message: "products.error.nameShort" }).max(MAX_NAME_LEN),
  sku,
  description: z.string().trim().max(MAX_DESC_LEN).optional().or(z.literal("")),
  categoryId: uuid.optional().or(z.literal("")),
  originCountry: isoCountry,
  unit: z.enum(PRODUCT_UNITS),
  priceUsd: positiveMoney,
  moq: positiveMoney,
  stock: positiveMoney,
  images: productImagesSchema,
  active: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.extend({
  id: uuid,
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const setActiveSchema = z.object({
  id: uuid,
  active: z.boolean(),
});
export type SetActiveInput = z.infer<typeof setActiveSchema>;
