/**
 * Orchestration for the marketplace product list. Owns TanStack Query wiring
 * and URL search-param synchronization so the presentation layer stays pure.
 */
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { listMarketplaceCategories, listMarketplaceProducts } from "@/lib/marketplace.functions";
import { PAGE_SIZE } from "@/lib/marketplace/constants";
import type { MarketplaceFilters } from "@/lib/marketplace/types";

const routeApi = getRouteApi("/_app/market");

export function productsQueryOptions(filters: MarketplaceFilters) {
  return queryOptions({
    queryKey: ["marketplace", "products", filters] as const,
    queryFn: () => listMarketplaceProducts({ data: { ...filters, pageSize: PAGE_SIZE } }),
    staleTime: 30_000,
  });
}

export const categoriesQueryOptions = queryOptions({
  queryKey: ["marketplace", "categories"] as const,
  queryFn: () => listMarketplaceCategories(),
  staleTime: 5 * 60_000,
});

export function useMarketplaceFilters(): MarketplaceFilters {
  const search = routeApi.useSearch();
  return useMemo(
    () => ({
      q: (search.q ?? "").slice(0, 120),
      category: (search.category ?? "").slice(0, 80),
      country: (search.country ?? "").slice(0, 2).toUpperCase(),
      sort: search.sort ?? "relevance",
      page: Math.max(1, Math.min(999, search.page ?? 1)),
    }),
    [search.q, search.category, search.country, search.sort, search.page],
  );
}

export function useMarketplaceList() {
  const filters = useMarketplaceFilters();
  const products = useSuspenseQuery(productsQueryOptions(filters));
  const categories = useSuspenseQuery(categoriesQueryOptions);
  return { filters, products: products.data, categories: categories.data };
}
