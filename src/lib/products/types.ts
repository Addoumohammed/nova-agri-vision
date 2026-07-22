/**
 * Product management domain types (supplier-facing).
 *
 * Decoupled from raw PostgREST rows so the UI is free to evolve without
 * churn in the presentation layer.
 */
export type ProductStatus = "active" | "inactive";

export type ProductSort =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "stock_asc"
  | "stock_desc";

export interface ProductRecord {
  id: string;
  supplierCompanyId: string;
  supplierName: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  originCountry: string | null;
  unit: string;
  priceUsd: number;
  moq: number;
  stock: number;
  images: string[];
  active: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListPage {
  items: ProductRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductFilters {
  q: string;
  category: string;   // slug
  status: "all" | ProductStatus;
  companyId: string;  // "" = all my companies
  sort: ProductSort;
  page: number;
}

export interface OwnedCompany {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  verified: boolean;
}

export interface ProductCategoryLite {
  id: string;
  slug: string;
  name: string;
}
