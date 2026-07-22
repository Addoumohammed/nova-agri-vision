/**
 * Suppliers domain types (buyer-facing directory + supplier self-service).
 *
 * Decoupled from PostgREST rows. `SupplierRecord` is a company enriched with
 * its `suppliers` extension row and aggregate counts computed server-side.
 */
export type SupplierSort =
  | "newest"
  | "oldest"
  | "rating_desc"
  | "rating_asc"
  | "name_asc"
  | "name_desc";

export type CompanyType = "supplier" | "exporter" | "farm";

export interface SupplierRecord {
  id: string;
  ownerId: string;
  name: string;
  slug: string | null;
  type: CompanyType;
  country: string | null;
  city: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  description: string | null;
  verified: boolean;
  rating: number;
  employees: number | null;
  founded: number | null;
  category: string | null;
  leadTimeDays: number | null;
  monthlyCapacityMt: number | null;
  certifications: string[];
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDetail extends SupplierRecord {
  ordersCount: number;
  activeContractsCount: number;
  isMine: boolean;
}

export interface SupplierListPage {
  items: SupplierRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupplierFilters {
  q: string;
  country: string;
  category: string;
  verifiedOnly: boolean;
  minRating: number;
  sort: SupplierSort;
  page: number;
}

export interface SupplierContract {
  id: string;
  title: string;
  status: "draft" | "active" | "completed" | "terminated";
  valueUsd: number;
  startDate: string | null;
  endDate: string | null;
  buyerCompanyId: string;
  supplierCompanyId: string;
  buyerCompanyName: string | null;
  supplierCompanyName: string | null;
  createdAt: string;
}
