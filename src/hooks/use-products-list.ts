/**
 * Products list orchestration — TanStack Query wiring + URL search-param sync.
 * The route owns the search-param validation; this hook exposes typed filters
 * and the paged result to the presentation layer.
 */
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { listMyCompanies, listMyProducts, listProductCategories } from "@/lib/products.functions";
import { PRODUCTS_PAGE_SIZE } from "@/lib/products/constants";
import type { ProductFilters } from "@/lib/products/types";

const routeApi = getRouteApi("/_app/products");

export function myProductsQueryOptions(filters: ProductFilters) {
  return queryOptions({
    queryKey: ["products", "mine", filters] as const,
    queryFn: () => listMyProducts({ data: { ...filters, pageSize: PRODUCTS_PAGE_SIZE } }),
    staleTime: 15_000,
  });
}

export const productCategoriesQueryOptions = queryOptions({
  queryKey: ["products", "categories"] as const,
  queryFn: () => listProductCategories(),
  staleTime: 5 * 60_000,
});

export const myCompaniesQueryOptions = queryOptions({
  queryKey: ["products", "companies", "mine"] as const,
  queryFn: () => listMyCompanies(),
  staleTime: 60_000,
});

export function useProductFilters(): ProductFilters {
  const search = routeApi.useSearch();
  return useMemo(
    () => ({
      q: (search.q ?? "").slice(0, 120),
      category: (search.category ?? "").slice(0, 80),
      status: search.status ?? "all",
      companyId: (search.companyId ?? "").slice(0, 80),
      sort: search.sort ?? "newest",
      page: Math.max(1, Math.min(9999, search.page ?? 1)),
    }),
    [search.q, search.category, search.status, search.companyId, search.sort, search.page],
  );
}

export function useProductsList() {
  const filters = useProductFilters();
  const products = useSuspenseQuery(myProductsQueryOptions(filters));
  const categories = useSuspenseQuery(productCategoriesQueryOptions);
  const companies = useSuspenseQuery(myCompaniesQueryOptions);
  return { filters, products: products.data, categories: categories.data, companies: companies.data };
}
