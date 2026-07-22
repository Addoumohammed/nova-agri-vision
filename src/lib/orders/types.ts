/**
 * Orders domain types.
 *
 * Decoupled from raw PostgREST rows so the UI can evolve without churn.
 * Every money field is a `number` in USD (schema stores numeric(14,2)).
 */
export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderSort =
  | "newest"
  | "oldest"
  | "total_desc"
  | "total_asc"
  | "eta_asc"
  | "eta_desc";

export type OrderRole = "buyer" | "supplier";

export interface OrderCompanyLite {
  id: string;
  name: string;
  country: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
}

export interface OrderItemRecord {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unit: string;
  unitPriceUsd: number;
  totalUsd: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  buyerCompanyId: string;
  supplierCompanyId: string;
  buyer: OrderCompanyLite | null;
  supplier: OrderCompanyLite | null;
  currency: string;
  subtotalUsd: number;
  discountPct: number;
  discountUsd: number;
  taxPct: number;
  taxUsd: number;
  totalUsd: number;
  incoterms: string | null;
  notes: string | null;
  eta: string | null;
  cancelledReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  items: OrderItemRecord[];
  /** Which side the current caller is on (for permission gates). */
  callerRole: OrderRole | "admin";
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  buyer: OrderCompanyLite | null;
  supplier: OrderCompanyLite | null;
  itemsCount: number;
  totalUsd: number;
  eta: string | null;
  createdAt: string;
  callerRole: OrderRole | "admin";
}

export interface OrderListPage {
  items: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderFilters {
  q: string;
  status: "all" | OrderStatus;
  role: "all" | OrderRole;
  sort: OrderSort;
  page: number;
}

export interface OrderStatusEvent {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string | null;
  note: string | null;
  changedAt: string;
}

export interface OrderCounterparty {
  id: string;
  name: string;
  country: string | null;
}

export interface OrderProductLite {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  priceUsd: number;
  moq: number;
  stock: number;
}
