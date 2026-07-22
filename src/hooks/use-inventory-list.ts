/**
 * Inventory list orchestration — TanStack Query + URL search-param sync.
 */
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  inventoryStats,
  listInventory,
  listMyProductsLite,
  listMyWarehouses,
  listStockMovements,
} from "@/lib/inventory.functions";
import { INVENTORY_PAGE_SIZE, MOVEMENTS_PAGE_SIZE } from "@/lib/inventory/constants";
import type { InventoryFilters } from "@/lib/inventory/types";

const routeApi = getRouteApi("/_app/inventory");

export function inventoryQueryOptions(filters: InventoryFilters) {
  return queryOptions({
    queryKey: ["inventory", "list", filters] as const,
    queryFn: () => listInventory({ data: { ...filters, pageSize: INVENTORY_PAGE_SIZE } }),
    staleTime: 15_000,
  });
}

export const inventoryStatsQueryOptions = queryOptions({
  queryKey: ["inventory", "stats"] as const,
  queryFn: () => inventoryStats(),
  staleTime: 30_000,
});

export const myWarehousesQueryOptions = queryOptions({
  queryKey: ["inventory", "warehouses"] as const,
  queryFn: () => listMyWarehouses(),
  staleTime: 60_000,
});

export const myProductsLiteQueryOptions = queryOptions({
  queryKey: ["inventory", "products", "lite"] as const,
  queryFn: () => listMyProductsLite(),
  staleTime: 60_000,
});

export function movementsQueryOptions(params: {
  inventoryId?: string; warehouseId?: string; productId?: string; page?: number;
}) {
  return queryOptions({
    queryKey: ["inventory", "movements", params] as const,
    queryFn: () => listStockMovements({
      data: {
        inventoryId: params.inventoryId,
        warehouseId: params.warehouseId,
        productId: params.productId,
        page: params.page ?? 1,
        pageSize: MOVEMENTS_PAGE_SIZE,
      },
    }),
    staleTime: 15_000,
  });
}

export function useInventoryFilters(): InventoryFilters {
  const search = routeApi.useSearch();
  return useMemo(
    () => ({
      q: (search.q ?? "").slice(0, 120),
      warehouseId: (search.warehouseId ?? "").slice(0, 80),
      status: search.status ?? "all",
      sort: search.sort ?? "newest",
      page: Math.max(1, Math.min(9999, search.page ?? 1)),
    }),
    [search.q, search.warehouseId, search.status, search.sort, search.page],
  );
}

export function useInventoryList() {
  const filters = useInventoryFilters();
  const inv = useSuspenseQuery(inventoryQueryOptions(filters));
  const warehouses = useSuspenseQuery(myWarehousesQueryOptions);
  const products = useSuspenseQuery(myProductsLiteQueryOptions);
  const stats = useSuspenseQuery(inventoryStatsQueryOptions);
  return {
    filters,
    inventory: inv.data,
    warehouses: warehouses.data,
    products: products.data,
    stats: stats.data,
  };
}
