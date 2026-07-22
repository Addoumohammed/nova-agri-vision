/**
 * Suppliers module constants — page size, sort options, category taxonomy.
 * Import-safe.
 */
import type { SupplierSort } from "./types";

export const SUPPLIERS_PAGE_SIZE = 12;

export const SUPPLIER_SORT_OPTIONS: ReadonlyArray<{ value: SupplierSort; labelKey: string }> = [
  { value: "newest",       labelKey: "suppliers.sort.newest" },
  { value: "oldest",       labelKey: "suppliers.sort.oldest" },
  { value: "rating_desc",  labelKey: "suppliers.sort.ratingDesc" },
  { value: "rating_asc",   labelKey: "suppliers.sort.ratingAsc" },
  { value: "name_asc",     labelKey: "suppliers.sort.nameAsc" },
  { value: "name_desc",    labelKey: "suppliers.sort.nameDesc" },
] as const;

/**
 * Curated category taxonomy for the extension row. Free text at the DB
 * level, controlled here for consistent filters.
 */
export const SUPPLIER_CATEGORIES = [
  "Fruits", "Vegetables", "Grains", "Beverages", "Spices", "Oils",
  "Nuts", "Dairy", "Meat", "Seafood", "Textiles", "Other",
] as const;
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

export const SUPPLIER_COMPANY_TYPES = ["supplier", "exporter", "farm"] as const;

/**
 * Common agricultural certifications (used by both the create form and
 * filter chips). Free text is still accepted server-side.
 */
export const CERTIFICATIONS = [
  "USDA Organic", "EU Organic", "GlobalG.A.P.", "HACCP", "ISO 22000",
  "FSSC 22000", "Rainforest Alliance", "Fairtrade", "Kosher", "Halal",
  "Non-GMO", "BRCGS",
] as const;

export const MAX_NAME_LEN = 140;
export const MAX_DESC_LEN = 2000;
export const MAX_SUBJECT_LEN = 140;
export const MAX_MESSAGE_LEN = 4000;
