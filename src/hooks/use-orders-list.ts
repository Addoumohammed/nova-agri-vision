/**
 * Orders list orchestration — TanStack Query + URL search-param sync.
 */
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  getOrder,
  getOrderTimeline,
  listCounterparties,
  listMyCompanies,
  listOrders,
  listSupplierProducts,
} from "@/lib/orders.functions";
import { ORDERS_PAGE_SIZE } from "@/lib/orders/constants";
import type { OrderFilters, OrderSort, OrderStatus } from "@/lib/orders/types";

const routeApi = getRouteApi("/_app/orders");

export function ordersListQueryOptions(filters: OrderFilters) {
  return queryOptions({
    queryKey: ["orders", "list", filters] as const,
    queryFn: () => listOrders({ data: { ...filters, pageSize: ORDERS_PAGE_SIZE } }),
    staleTime: 10_000,
  });
}

export const myCompaniesQueryOptions = queryOptions({
  queryKey: ["orders", "companies", "mine"] as const,
  queryFn: () => listMyCompanies(),
  staleTime: 60_000,
});

export const counterpartiesQueryOptions = queryOptions({
  queryKey: ["orders", "counterparties"] as const,
  queryFn: () => listCounterparties(),
  staleTime: 60_000,
});

export function supplierProductsQueryOptions(supplierCompanyId: string) {
  return queryOptions({
    queryKey: ["orders", "supplier-products", supplierCompanyId] as const,
    queryFn: () => listSupplierProducts({ data: { supplierCompanyId } }),
    staleTime: 30_000,
    enabled: Boolean(supplierCompanyId),
  });
}

export function orderDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["orders", "detail", id] as const,
    queryFn: () => getOrder({ data: { id } }),
    staleTime: 5_000,
    enabled: Boolean(id),
  });
}

export function orderTimelineQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["orders", "timeline", id] as const,
    queryFn: () => getOrderTimeline({ data: { id } }),
    staleTime: 5_000,
    enabled: Boolean(id),
  });
}

const ALLOWED_SORT = new Set<OrderSort>([
  "newest", "oldest", "total_desc", "total_asc", "eta_asc", "eta_desc",
]);
const ALLOWED_STATUS = new Set<OrderFilters["status"]>([
  "all", "draft", "pending", "confirmed", "shipped", "delivered", "cancelled",
]);
const ALLOWED_ROLE = new Set<OrderFilters["role"]>(["all", "buyer", "supplier"]);

export function useOrderFilters(): OrderFilters {
  const search = routeApi.useSearch();
  return useMemo(() => {
    const status = ALLOWED_STATUS.has(search.status as OrderStatus | "all")
      ? (search.status as OrderFilters["status"])
      : "all";
    const role = ALLOWED_ROLE.has(search.role as OrderFilters["role"])
      ? (search.role as OrderFilters["role"])
      : "all";
    const sort = ALLOWED_SORT.has(search.sort as OrderSort)
      ? (search.sort as OrderSort)
      : "newest";
    return {
      q: (search.q ?? "").slice(0, 120),
      status,
      role,
      sort,
      page: Math.max(1, Math.min(9999, search.page ?? 1)),
    };
  }, [search.q, search.status, search.role, search.sort, search.page]);
}

export function useOrdersList() {
  const filters = useOrderFilters();
  const orders = useSuspenseQuery(ordersListQueryOptions(filters));
  const myCompanies = useSuspenseQuery(myCompaniesQueryOptions);
  return { filters, orders: orders.data, myCompanies: myCompanies.data };
}
