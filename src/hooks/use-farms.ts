/**
 * Farms module — query orchestration + mutations.
 * TanStack Query wiring, URL search-param sync, and cache invalidation.
 */
import {
  queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery,
} from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  deleteActivity, deleteDocument, deleteFarm, deleteField,
  getFarmDetail, getFarmStats, listFarms,
  upsertActivity, upsertDocument, upsertFarm, upsertField,
} from "@/lib/farms.functions";
import { FARMS_PAGE_SIZE } from "@/lib/farms/constants";
import type { FarmFilters } from "@/lib/farms/types";

const routeApi = getRouteApi("/_app/farms");

export function farmsQueryOptions(filters: FarmFilters) {
  return queryOptions({
    queryKey: ["farms", "list", filters] as const,
    queryFn: () => listFarms({ data: { ...filters, pageSize: FARMS_PAGE_SIZE } }),
    staleTime: 30_000,
  });
}

export const farmStatsQueryOptions = queryOptions({
  queryKey: ["farms", "stats"] as const,
  queryFn: () => getFarmStats(),
  staleTime: 30_000,
});

export function farmDetailQueryOptions(id: string | null) {
  return queryOptions({
    queryKey: ["farms", "detail", id] as const,
    queryFn: () => (id ? getFarmDetail({ data: { id } }) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useFarmFilters(): FarmFilters {
  const search = routeApi.useSearch();
  return useMemo(
    () => ({
      q: (search.q ?? "").slice(0, 120),
      country: (search.country ?? "").slice(0, 2).toUpperCase(),
      crop: (search.crop ?? "").slice(0, 80),
      status: (search.status ?? "") as FarmFilters["status"],
      sort: (search.sort ?? "newest") as FarmFilters["sort"],
      page: Math.max(1, Math.min(999, Number(search.page ?? 1))),
    }),
    [search.q, search.country, search.crop, search.status, search.sort, search.page],
  );
}

export function useFarmsList() {
  const filters = useFarmFilters();
  const list = useSuspenseQuery(farmsQueryOptions(filters));
  const stats = useSuspenseQuery(farmStatsQueryOptions);
  return { filters, list: list.data, stats: stats.data };
}

export function useFarmDetail(id: string | null) {
  return useQuery(farmDetailQueryOptions(id));
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, farmId?: string) {
  qc.invalidateQueries({ queryKey: ["farms"] });
  if (farmId) qc.invalidateQueries({ queryKey: ["farms", "detail", farmId] });
}

export function useFarmMutations() {
  const qc = useQueryClient();

  const saveFarm = useMutation({
    mutationFn: upsertFarm,
    onSuccess: (res) => { invalidateAll(qc, res.id); toast.success("Farm saved"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save farm"),
  });

  const removeFarm = useMutation({
    mutationFn: deleteFarm,
    onSuccess: () => { invalidateAll(qc); toast.success("Farm deleted"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not delete farm"),
  });

  const saveField = useMutation({
    mutationFn: upsertField,
    onSuccess: (_r, vars) => { invalidateAll(qc, vars.data.farmId); toast.success("Field saved"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save field"),
  });
  const removeField = useMutation({
    mutationFn: deleteField,
    onSuccess: (_r, vars) => { invalidateAll(qc, vars.data.farmId); toast.success("Field deleted"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not delete field"),
  });

  const saveActivity = useMutation({
    mutationFn: upsertActivity,
    onSuccess: (_r, vars) => { invalidateAll(qc, vars.data.farmId); toast.success("Activity logged"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save activity"),
  });
  const removeActivity = useMutation({
    mutationFn: deleteActivity,
    onSuccess: (_r, vars) => { invalidateAll(qc, vars.data.farmId); toast.success("Activity removed"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not delete activity"),
  });

  const saveDocument = useMutation({
    mutationFn: upsertDocument,
    onSuccess: (_r, vars) => { invalidateAll(qc, vars.data.farmId); toast.success("Document saved"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save document"),
  });
  const removeDocument = useMutation({
    mutationFn: deleteDocument,
    onSuccess: (_r, vars) => { invalidateAll(qc, vars.data.farmId); toast.success("Document deleted"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not delete document"),
  });

  return { saveFarm, removeFarm, saveField, removeField, saveActivity, removeActivity, saveDocument, removeDocument };
}
