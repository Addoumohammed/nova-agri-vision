/**
 * Inventory module constants — single source of truth for enums, page size
 * and lookup tables. Import-safe (no side effects, no server-only APIs).
 */
import type { InventorySort, StockMovementType } from "./types";

export const INVENTORY_PAGE_SIZE = 20;
export const MOVEMENTS_PAGE_SIZE = 30;

export const INVENTORY_SORT_OPTIONS: ReadonlyArray<{ value: InventorySort; labelKey: string }> = [
  { value: "newest",         labelKey: "inventory.sort.newest" },
  { value: "oldest",         labelKey: "inventory.sort.oldest" },
  { value: "product_asc",    labelKey: "inventory.sort.productAsc" },
  { value: "product_desc",   labelKey: "inventory.sort.productDesc" },
  { value: "quantity_desc",  labelKey: "inventory.sort.quantityDesc" },
  { value: "quantity_asc",   labelKey: "inventory.sort.quantityAsc" },
  { value: "available_desc", labelKey: "inventory.sort.availableDesc" },
  { value: "available_asc",  labelKey: "inventory.sort.availableAsc" },
] as const;

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  in: "inventory.movement.in",
  out: "inventory.movement.out",
  adjust: "inventory.movement.adjust",
  transfer_in: "inventory.movement.transferIn",
  transfer_out: "inventory.movement.transferOut",
};

export const INVENTORY_UNITS = ["MT","KG","L","BAG","PALLET","CONTAINER","BOX","PIECE"] as const;

export const MAX_REASON_LEN = 500;
export const MAX_REFERENCE_LEN = 120;
export const MAX_WAREHOUSE_NAME_LEN = 140;
export const MAX_ADDRESS_LEN = 500;
export const MAX_BARCODE_LEN = 64;
