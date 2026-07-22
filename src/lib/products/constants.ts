/**
 * Product module constants — single source of truth for enums, page size and
 * lookup tables. Kept import-safe (no side effects, no server-only APIs).
 */
import type { ProductSort } from "./types";

export const PRODUCTS_PAGE_SIZE = 15;

export const PRODUCT_SORT_OPTIONS: ReadonlyArray<{ value: ProductSort; labelKey: string }> = [
  { value: "newest",     labelKey: "products.sort.newest" },
  { value: "oldest",     labelKey: "products.sort.oldest" },
  { value: "name_asc",   labelKey: "products.sort.nameAsc" },
  { value: "name_desc",  labelKey: "products.sort.nameDesc" },
  { value: "price_asc",  labelKey: "products.sort.priceAsc" },
  { value: "price_desc", labelKey: "products.sort.priceDesc" },
  { value: "stock_desc", labelKey: "products.sort.stockDesc" },
  { value: "stock_asc",  labelKey: "products.sort.stockAsc" },
] as const;

/** Product units — matches the DB `unit` column (free text, but constrained in UI). */
export const PRODUCT_UNITS = ["MT","KG","L","BAG","PALLET","CONTAINER","BOX","PIECE"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const MAX_NAME_LEN = 140;
export const MAX_DESC_LEN = 4000;
export const MAX_SKU_LEN = 64;
export const MAX_IMAGES = 8;

export const PRODUCT_STATUS_LABELS: Record<"active" | "inactive", string> = {
  active: "products.status.active",
  inactive: "products.status.inactive",
};
