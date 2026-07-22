/**
 * Marketplace domain types.
 *
 * These are the DTOs the UI consumes. They are intentionally decoupled from
 * the raw Postgres row shapes so the presentation layer never has to reason
 * about database columns, embeds, or nullability idiosyncrasies.
 */

export type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "stock";

export interface MarketplaceCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  productCount: number;
}

export interface MarketplaceSupplier {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  city: string | null;
  verified: boolean;
  rating: number;
}

export interface MarketplaceCertification {
  id: string;
  certType: string;
  issuer: string | null;
  verified: boolean;
  expiresAt: string | null;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  originCountry: string | null;
  unit: string;
  priceUsd: number;
  moq: number;
  stock: number;
  images: string[];
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  supplier: MarketplaceSupplier;
  certifications: MarketplaceCertification[];
  createdAt: string;
}

export interface MarketplaceListPage {
  items: MarketplaceProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MarketplaceFilters {
  q: string;
  category: string; // slug or "" for all
  country: string; // ISO-2 or "" for all
  sort: SortOption;
  page: number;
}
