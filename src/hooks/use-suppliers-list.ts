/**
 * Suppliers directory query orchestration.
 * Owns TanStack Query wiring + URL search-param sync.
 */
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  getSupplierDetail,
  listMyOwnedCompanies,
  listSuppliers,
} from "@/lib/suppliers.functions";
import { SUPPLIERS_PAGE_SIZE } from "@/lib/suppliers/constants";
import type { SupplierFilters } from "@/lib/suppliers/types";

const routeApi = getRouteApi("/_app/suppliers");

export function suppliersQueryOptions(filters: SupplierFilters) {
  return queryOptions({
    queryKey: ["suppliers", "list", filters] as const,
    queryFn: () => listSuppliers({ data: { ...filters, pageSize: SUPPLIERS_PAGE_SIZE } }),
    staleTime: 30_000,
  });
}

export function supplierDetailQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: ["suppliers", "detail", id] as const,
    queryFn: () => (id ? getSupplierDetail({ data: { id } }) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export const myCompaniesQueryOptions = queryOptions({
  queryKey: ["suppliers", "mine"] as const,
  queryFn: () => listMyOwnedCompanies(),
  staleTime: 60_000,
});

export function useSupplierFilters(): SupplierFilters {
  const search = routeApi.useSearch();
  return useMemo(
    () => ({
      q: (search.q ?? "").slice(0, 120),
      country: (search.country ?? "").slice(0, 2).toUpperCase(),
      category: (search.category ?? "").slice(0, 80),
      verifiedOnly: !!search.verifiedOnly,
      minRating: Math.max(0, Math.min(5, Number(search.minRating ?? 0))),
      sort: (search.sort ?? "newest") as SupplierFilters["sort"],
      page: Math.max(1, Math.min(999, Number(search.page ?? 1))),
    }),
    [search.q, search.country, search.category, search.verifiedOnly, search.minRating, search.sort, search.page],
  );
}

export function useSuppliersList() {
  const filters = useSupplierFilters();
  const list = useSuspenseQuery(suppliersQueryOptions(filters));
  return { filters, list: list.data };
}

export function useSupplierDetail(id: string | null) {
  return useQuery(supplierDetailQueryOptions(id));
}

export function useMyCompanies() {
  return useQuery(myCompaniesQueryOptions);
}
