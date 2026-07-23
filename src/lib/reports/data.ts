/**
 * Reports data layer — aggregates demo data into typed reports.
 * Each report exposes: metadata (id, name, category, description),
 * a row generator (filtered by date range), column definitions
 * (used for CSV/Excel/PDF exports), and optional KPI + chart series.
 */
import {
  orders, invoices, shipments, suppliers, buyers, products, topCountries,
  monthlyTrade, currency,
} from "@/lib/demo-data";
import { revenueSeries } from "@/lib/dashboard-data";

export type DateRange = { from: Date; to: Date };
export type RangePreset = "7d" | "30d" | "90d" | "ytd" | "12m" | "all";

export function presetRange(preset: RangePreset): DateRange {
  const to = new Date();
  const from = new Date(to);
  switch (preset) {
    case "7d": from.setDate(to.getDate() - 7); break;
    case "30d": from.setDate(to.getDate() - 30); break;
    case "90d": from.setDate(to.getDate() - 90); break;
    case "ytd": from.setMonth(0, 1); break;
    case "12m": from.setMonth(to.getMonth() - 12); break;
    case "all": from.setFullYear(2000, 0, 1); break;
  }
  return { from, to };
}

export function inRange(iso: string, r: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= r.from.getTime() && t <= r.to.getTime();
}

export type ReportCategory = "trade" | "finance" | "logistics" | "network" | "catalog" | "compliance";

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number;
  align?: "left" | "right" | "center";
}

export interface ReportDef<T = Record<string, unknown>> {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
  columns: ColumnDef<T>[];
  rows: (range: DateRange) => T[];
  summary?: (rows: T[]) => { label: string; value: string }[];
}

// ---------- Individual reports ----------

const ORDERS_REPORT: ReportDef<typeof orders[number]> = {
  id: "orders_ledger",
  name: "Orders Ledger",
  category: "trade",
  description: "Complete order history with buyer, supplier, quantity, status and totals.",
  columns: [
    { key: "id", label: "Order ID" },
    { key: "created_at", label: "Created" },
    { key: "product_name", label: "Product" },
    { key: "quantity", label: "Qty", align: "right" },
    { key: "unit", label: "Unit" },
    { key: "total_usd", label: "Total (USD)", align: "right", format: (r) => r.total_usd },
    { key: "status", label: "Status" },
    { key: "eta", label: "ETA" },
  ],
  rows: (r) => orders.filter((o) => inRange(o.created_at, r)),
  summary: (rs) => [
    { label: "Orders", value: rs.length.toLocaleString() },
    { label: "Total value", value: currency(rs.reduce((s, r) => s + r.total_usd, 0)) },
    { label: "Avg deal size", value: currency(rs.length ? rs.reduce((s, r) => s + r.total_usd, 0) / rs.length : 0) },
    { label: "Delivered", value: rs.filter((r) => r.status === "delivered").length.toLocaleString() },
  ],
};

const INVOICES_REPORT: ReportDef<typeof invoices[number]> = {
  id: "invoices_ar",
  name: "Accounts Receivable",
  category: "finance",
  description: "Invoices issued, paid, outstanding and overdue.",
  columns: [
    { key: "id", label: "Invoice" },
    { key: "order_id", label: "Order" },
    { key: "buyer", label: "Buyer" },
    { key: "supplier", label: "Supplier" },
    { key: "amount_usd", label: "Amount (USD)", align: "right" },
    { key: "status", label: "Status" },
    { key: "issued_at", label: "Issued" },
    { key: "due_at", label: "Due" },
  ],
  rows: (r) => invoices.filter((i) => inRange(i.issued_at, r)),
  summary: (rs) => {
    const total = rs.reduce((s, r) => s + r.amount_usd, 0);
    const paid = rs.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount_usd, 0);
    const overdue = rs.filter((r) => r.status === "overdue").reduce((s, r) => s + r.amount_usd, 0);
    return [
      { label: "Invoiced", value: currency(total) },
      { label: "Paid", value: currency(paid) },
      { label: "Outstanding", value: currency(total - paid) },
      { label: "Overdue", value: currency(overdue) },
    ];
  },
};

const SHIPMENTS_REPORT: ReportDef<typeof shipments[number]> = {
  id: "shipments_log",
  name: "Shipments Log",
  category: "logistics",
  description: "In-transit, delivered and delayed shipments with carrier & route.",
  columns: [
    { key: "id", label: "Shipment" },
    { key: "order_id", label: "Order" },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
    { key: "mode", label: "Mode" },
    { key: "carrier", label: "Carrier" },
    { key: "status", label: "Status" },
    { key: "progress", label: "Progress %", align: "right" },
    { key: "eta", label: "ETA" },
    { key: "value_usd", label: "Value (USD)", align: "right" },
  ],
  rows: () => shipments,
  summary: (rs) => [
    { label: "Total shipments", value: rs.length.toLocaleString() },
    { label: "In transit", value: rs.filter((r) => r.status === "in_transit").length.toLocaleString() },
    { label: "Delivered", value: rs.filter((r) => r.status === "delivered").length.toLocaleString() },
    { label: "Delayed", value: rs.filter((r) => r.status === "delayed").length.toLocaleString() },
  ],
};

const SUPPLIERS_REPORT: ReportDef<typeof suppliers[number]> = {
  id: "suppliers_scorecard",
  name: "Supplier Scorecard",
  category: "network",
  description: "Ratings, lead time, order volume and verification status per supplier.",
  columns: [
    { key: "company", label: "Supplier" },
    { key: "country", label: "Country" },
    { key: "category", label: "Category" },
    { key: "rating", label: "Rating", align: "right" },
    { key: "lead_time_days", label: "Lead time (d)", align: "right" },
    { key: "orders", label: "Orders", align: "right" },
    { key: "volume_usd", label: "Volume (USD)", align: "right" },
    { key: "verified", label: "Verified", format: (r) => (r.verified ? "Yes" : "No") },
  ],
  rows: () => suppliers,
  summary: (rs) => [
    { label: "Suppliers", value: rs.length.toLocaleString() },
    { label: "Verified", value: rs.filter((r) => r.verified).length.toLocaleString() },
    { label: "Avg rating", value: (rs.reduce((s, r) => s + r.rating, 0) / (rs.length || 1)).toFixed(2) },
    { label: "Total volume", value: currency(rs.reduce((s, r) => s + r.volume_usd, 0)) },
  ],
};

const BUYERS_REPORT: ReportDef<typeof buyers[number]> = {
  id: "buyers_cohort",
  name: "Buyer Cohort",
  category: "network",
  description: "Repeat activity, spend and rating across active buyers.",
  columns: [
    { key: "company", label: "Buyer" },
    { key: "country", label: "Country" },
    { key: "category", label: "Preferred category" },
    { key: "rating", label: "Rating", align: "right" },
    { key: "orders", label: "Orders", align: "right" },
    { key: "spend_usd", label: "Spend (USD)", align: "right" },
    { key: "verified", label: "Verified", format: (r) => (r.verified ? "Yes" : "No") },
  ],
  rows: () => buyers,
  summary: (rs) => [
    { label: "Buyers", value: rs.length.toLocaleString() },
    { label: "Total spend", value: currency(rs.reduce((s, r) => s + r.spend_usd, 0)) },
    { label: "Avg spend", value: currency(rs.reduce((s, r) => s + r.spend_usd, 0) / (rs.length || 1)) },
  ],
};

const PRODUCTS_REPORT: ReportDef<typeof products[number]> = {
  id: "catalog_snapshot",
  name: "Catalog Snapshot",
  category: "catalog",
  description: "Live pricing, stock and minimum order quantity per SKU.",
  columns: [
    { key: "name", label: "Product" },
    { key: "category", label: "Category" },
    { key: "origin", label: "Origin" },
    { key: "unit", label: "Unit" },
    { key: "price_usd", label: "Price (USD)", align: "right" },
    { key: "moq", label: "MOQ", align: "right" },
    { key: "stock", label: "Stock", align: "right" },
  ],
  rows: () => products,
  summary: (rs) => [
    { label: "SKUs", value: rs.length.toLocaleString() },
    { label: "Avg price", value: currency(rs.reduce((s, r) => s + r.price_usd, 0) / (rs.length || 1)) },
    { label: "Stock units", value: rs.reduce((s, r) => s + r.stock, 0).toLocaleString() },
  ],
};

type CountryRow = { country: string; volume: number; share: number };
const COUNTRIES_REPORT: ReportDef<CountryRow> = {
  id: "top_destinations",
  name: "Top Export Destinations",
  category: "trade",
  description: "Share of export volume by destination country.",
  columns: [
    { key: "country", label: "Country" },
    { key: "volume", label: "Volume (USD)", align: "right" },
    { key: "share", label: "Share %", align: "right" },
  ],
  rows: () => topCountries.map((c) => ({ country: c.country, volume: c.volume, share: c.share })),
  summary: (rs) => [
    { label: "Countries", value: rs.length.toLocaleString() },
    { label: "Total volume", value: currency(rs.reduce((s, r) => s + r.volume, 0)) },
  ],
};

export const REPORTS = [
  ORDERS_REPORT,
  INVOICES_REPORT,
  SHIPMENTS_REPORT,
  SUPPLIERS_REPORT,
  BUYERS_REPORT,
  PRODUCTS_REPORT,
  COUNTRIES_REPORT,
] as const;

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  trade: "Trade",
  finance: "Finance",
  logistics: "Logistics",
  network: "Network",
  catalog: "Catalog",
  compliance: "Compliance",
};

// ---------- Analytics dashboards ----------

export function analyticsKpis(range: DateRange) {
  const rangedOrders = orders.filter((o) => inRange(o.created_at, range));
  const rangedInvoices = invoices.filter((i) => inRange(i.issued_at, range));
  const gmv = rangedOrders.reduce((s, r) => s + r.total_usd, 0);
  const paid = rangedInvoices.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount_usd, 0);
  const outstanding = rangedInvoices.reduce((s, r) => s + r.amount_usd, 0) - paid;
  const delivered = rangedOrders.filter((r) => r.status === "delivered").length;
  const fulfillment = rangedOrders.length ? (delivered / rangedOrders.length) * 100 : 0;
  return { gmv, paid, outstanding, ordersCount: rangedOrders.length, fulfillment };
}

export { revenueSeries, monthlyTrade, topCountries };
