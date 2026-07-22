/**
 * Inventory domain types (warehouse + stock management).
 *
 * Decoupled from raw PostgREST rows so UI layers stay stable while the
 * database schema evolves. Every quantity is a plain number (numeric →
 * number in the server layer) with the unit carried alongside.
 */
export type StockMovementType = "in" | "out" | "adjust" | "transfer_in" | "transfer_out";

export type StockStatus = "ok" | "low" | "out";

export type InventorySort =
  | "newest"
  | "oldest"
  | "product_asc"
  | "product_desc"
  | "quantity_asc"
  | "quantity_desc"
  | "available_asc"
  | "available_desc";

export type InventoryStatusFilter = "all" | "in_stock" | "low" | "out";

export interface WarehouseRecord {
  id: string;
  companyId: string;
  companyName: string | null;
  name: string;
  address: string | null;
  country: string | null;
  city: string | null;
  capacityMt: number | null;
  latitude: number | null;
  longitude: number | null;
  itemsCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLite {
  id: string;
  supplierCompanyId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
}

export interface InventoryRecord {
  id: string;
  warehouseId: string;
  warehouseName: string;
  companyId: string;
  productId: string;
  productName: string;
  productSku: string | null;
  productBarcode: string | null;
  unit: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  status: StockStatus;
  updatedAt: string;
}

export interface InventoryListPage {
  items: InventoryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InventoryFilters {
  q: string;
  warehouseId: string;
  status: InventoryStatusFilter;
  sort: InventorySort;
  page: number;
}

export interface InventoryStats {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  warehousesCount: number;
}

export interface StockMovementRecord {
  id: string;
  inventoryId: string | null;
  warehouseId: string;
  warehouseName: string | null;
  productId: string;
  productName: string | null;
  movementType: StockMovementType;
  quantity: number;
  previousQty: number;
  newQty: number;
  unit: string;
  reason: string | null;
  reference: string | null;
  createdAt: string;
}
