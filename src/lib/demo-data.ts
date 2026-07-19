// Database-ready demo data & entity models for Nova Pro.
// These interfaces mirror the future backend schema.

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "exporter" | "importer" | "buyer" | "supplier";
  company_id: string;
  avatar?: string;
  verified: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  country: string;
  type: "exporter" | "importer" | "buyer" | "supplier";
  rating: number;
  verified: boolean;
  employees: number;
  founded: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  origin: string;
  unit: string;
  price_usd: number;
  moq: number;
  stock: number;
  supplier_id: string;
  image?: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  supplier_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  total_usd: number;
  status: "draft" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  eta: string;
}

export interface Supplier {
  id: string;
  company: string;
  country: string;
  category: string;
  rating: number;
  orders: number;
  volume_usd: number;
  verified: boolean;
  lead_time_days: number;
  contact: string;
}

export interface Buyer {
  id: string;
  company: string;
  country: string;
  category: string;
  rating: number;
  orders: number;
  spend_usd: number;
  verified: boolean;
  contact: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  origin: string;
  destination: string;
  mode: "sea" | "air" | "land";
  carrier: string;
  status: "preparing" | "in_transit" | "customs" | "delivered" | "delayed";
  eta: string;
  progress: number;
  value_usd: number;
}

export interface Invoice {
  id: string;
  order_id: string;
  buyer: string;
  supplier: string;
  amount_usd: number;
  status: "draft" | "sent" | "paid" | "overdue";
  issued_at: string;
  due_at: string;
}

// ------ Seed data ------

export const companies: Company[] = [
  { id: "c_nile", name: "Nile Exports Co.", country: "Egypt", type: "exporter", rating: 4.9, verified: true, employees: 240, founded: 2011 },
  { id: "c_atlas", name: "Atlas Agri Holding", country: "Morocco", type: "exporter", rating: 4.7, verified: true, employees: 180, founded: 2014 },
  { id: "c_rotterdam", name: "Rotterdam Fresh BV", country: "Netherlands", type: "importer", rating: 4.8, verified: true, employees: 95, founded: 2008 },
  { id: "c_hamburg", name: "Hamburg Trading GmbH", country: "Germany", type: "importer", rating: 4.6, verified: true, employees: 120, founded: 2005 },
  { id: "c_tokyo", name: "Tokyo Green Foods", country: "Japan", type: "buyer", rating: 4.9, verified: true, employees: 300, founded: 2000 },
];

export const suppliers: Supplier[] = [
  { id: "s_001", company: "Delta Citrus Growers", country: "Egypt", category: "Fruits", rating: 4.9, orders: 342, volume_usd: 4_820_000, verified: true, lead_time_days: 7, contact: "sales@deltacitrus.eg" },
  { id: "s_002", company: "Atlas Olive Mills", country: "Morocco", category: "Oils", rating: 4.8, orders: 218, volume_usd: 3_120_000, verified: true, lead_time_days: 10, contact: "trade@atlasolive.ma" },
  { id: "s_003", company: "Punjab Rice Traders", country: "India", category: "Grains", rating: 4.7, orders: 511, volume_usd: 6_540_000, verified: true, lead_time_days: 14, contact: "exports@punjabrice.in" },
  { id: "s_004", company: "Andes Coffee Coop", country: "Colombia", category: "Beverages", rating: 4.9, orders: 189, volume_usd: 2_890_000, verified: true, lead_time_days: 12, contact: "hola@andescoffee.co" },
  { id: "s_005", company: "Kenya Tea Union", country: "Kenya", category: "Beverages", rating: 4.6, orders: 267, volume_usd: 1_980_000, verified: true, lead_time_days: 9, contact: "info@kenyatea.co.ke" },
  { id: "s_006", company: "Ukraine Grain Board", country: "Ukraine", category: "Grains", rating: 4.5, orders: 402, volume_usd: 8_120_000, verified: false, lead_time_days: 18, contact: "ops@ukrgrain.ua" },
  { id: "s_007", company: "Bekaa Valley Herbs", country: "Lebanon", category: "Herbs", rating: 4.7, orders: 143, volume_usd: 780_000, verified: true, lead_time_days: 6, contact: "sales@bekaaherbs.lb" },
  { id: "s_008", company: "Ceylon Spice Co.", country: "Sri Lanka", category: "Spices", rating: 4.8, orders: 276, volume_usd: 1_450_000, verified: true, lead_time_days: 11, contact: "trade@ceylonspice.lk" },
];

export const buyers: Buyer[] = [
  { id: "b_001", company: "Rotterdam Fresh BV", country: "Netherlands", category: "Fruits", rating: 4.9, orders: 128, spend_usd: 5_620_000, verified: true, contact: "buy@rotfresh.nl" },
  { id: "b_002", company: "Hamburg Trading GmbH", country: "Germany", category: "Grains", rating: 4.8, orders: 214, spend_usd: 7_890_000, verified: true, contact: "procurement@hamburgtrading.de" },
  { id: "b_003", company: "Tokyo Green Foods", country: "Japan", category: "Vegetables", rating: 4.9, orders: 96, spend_usd: 4_120_000, verified: true, contact: "sourcing@tokyogreen.jp" },
  { id: "b_004", company: "Riyadh Foodstuffs LLC", country: "Saudi Arabia", category: "Meat & Dairy", rating: 4.7, orders: 182, spend_usd: 6_240_000, verified: true, contact: "buy@riyadhfoods.sa" },
  { id: "b_005", company: "London Organic Ltd", country: "United Kingdom", category: "Fruits", rating: 4.8, orders: 143, spend_usd: 3_950_000, verified: true, contact: "hello@londonorganic.co.uk" },
  { id: "b_006", company: "Singapore Provisions Pte", country: "Singapore", category: "Spices", rating: 4.6, orders: 87, spend_usd: 1_820_000, verified: true, contact: "trade@sgprov.sg" },
  { id: "b_007", company: "Dubai Gourmet DMCC", country: "UAE", category: "Beverages", rating: 4.9, orders: 154, spend_usd: 3_310_000, verified: true, contact: "info@dubaigourmet.ae" },
];

export const products: Product[] = [
  { id: "p_001", name: "Navel Oranges Grade A", category: "Fruits", origin: "Egypt", unit: "MT", price_usd: 640, moq: 20, stock: 1_240, supplier_id: "s_001" },
  { id: "p_002", name: "Extra Virgin Olive Oil", category: "Oils", origin: "Morocco", unit: "L", price_usd: 6.4, moq: 5000, stock: 82_400, supplier_id: "s_002" },
  { id: "p_003", name: "Basmati Rice 1121", category: "Grains", origin: "India", unit: "MT", price_usd: 1_180, moq: 25, stock: 3_200, supplier_id: "s_003" },
  { id: "p_004", name: "Arabica Green Coffee", category: "Beverages", origin: "Colombia", unit: "MT", price_usd: 4_920, moq: 10, stock: 640, supplier_id: "s_004" },
  { id: "p_005", name: "Black Tea CTC", category: "Beverages", origin: "Kenya", unit: "MT", price_usd: 2_340, moq: 15, stock: 890, supplier_id: "s_005" },
  { id: "p_006", name: "Milling Wheat", category: "Grains", origin: "Ukraine", unit: "MT", price_usd: 268, moq: 500, stock: 42_000, supplier_id: "s_006" },
  { id: "p_007", name: "Dried Oregano", category: "Herbs", origin: "Lebanon", unit: "kg", price_usd: 12.8, moq: 500, stock: 18_400, supplier_id: "s_007" },
  { id: "p_008", name: "Ceylon Cinnamon Sticks", category: "Spices", origin: "Sri Lanka", unit: "kg", price_usd: 24.5, moq: 200, stock: 6_120, supplier_id: "s_008" },
];

export const orders: Order[] = [
  { id: "ORD-24-1042", buyer_id: "b_001", supplier_id: "s_001", product_id: "p_001", product_name: "Navel Oranges Grade A", quantity: 120, unit: "MT", total_usd: 76_800, status: "shipped", created_at: "2026-06-28", eta: "2026-07-24" },
  { id: "ORD-24-1041", buyer_id: "b_002", supplier_id: "s_006", product_id: "p_006", product_name: "Milling Wheat", quantity: 2000, unit: "MT", total_usd: 536_000, status: "confirmed", created_at: "2026-07-01", eta: "2026-08-05" },
  { id: "ORD-24-1040", buyer_id: "b_003", supplier_id: "s_003", product_id: "p_003", product_name: "Basmati Rice 1121", quantity: 80, unit: "MT", total_usd: 94_400, status: "delivered", created_at: "2026-06-12", eta: "2026-07-10" },
  { id: "ORD-24-1039", buyer_id: "b_007", supplier_id: "s_004", product_id: "p_004", product_name: "Arabica Green Coffee", quantity: 24, unit: "MT", total_usd: 118_080, status: "pending", created_at: "2026-07-15", eta: "2026-08-14" },
  { id: "ORD-24-1038", buyer_id: "b_004", supplier_id: "s_002", product_id: "p_002", product_name: "Extra Virgin Olive Oil", quantity: 12_000, unit: "L", total_usd: 76_800, status: "shipped", created_at: "2026-06-30", eta: "2026-07-22" },
  { id: "ORD-24-1037", buyer_id: "b_005", supplier_id: "s_001", product_id: "p_001", product_name: "Navel Oranges Grade A", quantity: 60, unit: "MT", total_usd: 38_400, status: "delivered", created_at: "2026-06-04", eta: "2026-06-28" },
  { id: "ORD-24-1036", buyer_id: "b_006", supplier_id: "s_008", product_id: "p_008", product_name: "Ceylon Cinnamon Sticks", quantity: 800, unit: "kg", total_usd: 19_600, status: "draft", created_at: "2026-07-17", eta: "2026-08-20" },
  { id: "ORD-24-1035", buyer_id: "b_002", supplier_id: "s_005", product_id: "p_005", product_name: "Black Tea CTC", quantity: 45, unit: "MT", total_usd: 105_300, status: "cancelled", created_at: "2026-06-22", eta: "2026-07-18" },
];

export const shipments: Shipment[] = [
  { id: "SHP-8842", order_id: "ORD-24-1042", origin: "Alexandria, EG", destination: "Rotterdam, NL", mode: "sea", carrier: "Maersk", status: "in_transit", eta: "2026-07-24", progress: 62, value_usd: 76_800 },
  { id: "SHP-8841", order_id: "ORD-24-1041", origin: "Odesa, UA", destination: "Hamburg, DE", mode: "sea", carrier: "MSC", status: "preparing", eta: "2026-08-05", progress: 12, value_usd: 536_000 },
  { id: "SHP-8840", order_id: "ORD-24-1038", origin: "Casablanca, MA", destination: "Jeddah, SA", mode: "sea", carrier: "CMA CGM", status: "customs", eta: "2026-07-22", progress: 82, value_usd: 76_800 },
  { id: "SHP-8839", order_id: "ORD-24-1040", origin: "Mumbai, IN", destination: "Tokyo, JP", mode: "sea", carrier: "ONE", status: "delivered", eta: "2026-07-10", progress: 100, value_usd: 94_400 },
  { id: "SHP-8838", order_id: "ORD-24-1039", origin: "Bogotá, CO", destination: "Dubai, AE", mode: "air", carrier: "Emirates SkyCargo", status: "in_transit", eta: "2026-08-14", progress: 34, value_usd: 118_080 },
  { id: "SHP-8837", order_id: "ORD-24-1037", origin: "Alexandria, EG", destination: "Felixstowe, UK", mode: "sea", carrier: "Hapag-Lloyd", status: "delayed", eta: "2026-07-02", progress: 96, value_usd: 38_400 },
];

export const invoices: Invoice[] = [
  { id: "INV-2026-0428", order_id: "ORD-24-1042", buyer: "Rotterdam Fresh BV", supplier: "Delta Citrus Growers", amount_usd: 76_800, status: "sent", issued_at: "2026-06-29", due_at: "2026-07-29" },
  { id: "INV-2026-0427", order_id: "ORD-24-1041", buyer: "Hamburg Trading GmbH", supplier: "Ukraine Grain Board", amount_usd: 536_000, status: "sent", issued_at: "2026-07-02", due_at: "2026-08-02" },
  { id: "INV-2026-0426", order_id: "ORD-24-1040", buyer: "Tokyo Green Foods", supplier: "Punjab Rice Traders", amount_usd: 94_400, status: "paid", issued_at: "2026-06-13", due_at: "2026-07-13" },
  { id: "INV-2026-0425", order_id: "ORD-24-1039", buyer: "Dubai Gourmet DMCC", supplier: "Andes Coffee Coop", amount_usd: 118_080, status: "draft", issued_at: "2026-07-16", due_at: "2026-08-16" },
  { id: "INV-2026-0424", order_id: "ORD-24-1038", buyer: "Riyadh Foodstuffs LLC", supplier: "Atlas Olive Mills", amount_usd: 76_800, status: "sent", issued_at: "2026-07-01", due_at: "2026-07-31" },
  { id: "INV-2026-0423", order_id: "ORD-24-1037", buyer: "London Organic Ltd", supplier: "Delta Citrus Growers", amount_usd: 38_400, status: "overdue", issued_at: "2026-06-05", due_at: "2026-07-05" },
  { id: "INV-2026-0422", order_id: "ORD-24-1035", buyer: "Hamburg Trading GmbH", supplier: "Kenya Tea Union", amount_usd: 105_300, status: "overdue", issued_at: "2026-06-23", due_at: "2026-07-23" },
];

export const topCountries = [
  { country: "Netherlands", flag: "🇳🇱", volume: 5_620_000, share: 22 },
  { country: "Germany", flag: "🇩🇪", volume: 4_890_000, share: 19 },
  { country: "Saudi Arabia", flag: "🇸🇦", volume: 3_540_000, share: 14 },
  { country: "United Kingdom", flag: "🇬🇧", volume: 2_910_000, share: 11 },
  { country: "Japan", flag: "🇯🇵", volume: 2_310_000, share: 9 },
  { country: "UAE", flag: "🇦🇪", volume: 1_980_000, share: 8 },
];

export const monthlyTrade = [
  { month: "Jan", exports: 2.1, imports: 1.4 },
  { month: "Feb", exports: 2.4, imports: 1.6 },
  { month: "Mar", exports: 2.9, imports: 1.9 },
  { month: "Apr", exports: 3.1, imports: 2.2 },
  { month: "May", exports: 3.6, imports: 2.5 },
  { month: "Jun", exports: 4.0, imports: 2.8 },
  { month: "Jul", exports: 4.5, imports: 3.2 },
];

export const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
