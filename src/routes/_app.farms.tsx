/**
 * Farmers module — farm operations workspace.
 *
 * Layering:
 *   - Presentation: this file + `src/components/farms/*`
 *   - Business:     `src/hooks/use-farms.ts`
 *   - Data:         `src/lib/farms.functions.ts` (RLS-scoped server fns)
 *   - Domain:       `src/lib/farms/{types,schemas,constants,format}.ts`
 */
import { AlertTriangle, ChevronLeft, ChevronRight, FileText, Layers, Plus, Ruler, Sprout } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FarmCard } from "@/components/farms/farm-card";
import { FarmDetailSheet } from "@/components/farms/farm-detail-sheet";
import { FarmFiltersBar } from "@/components/farms/farm-filters";
import { FarmFormDialog } from "@/components/farms/farm-form-dialog";
import { farmsQueryOptions, farmStatsQueryOptions, useFarmsList } from "@/hooks/use-farms";
import { FARMS_PAGE_SIZE, FARM_STATUSES } from "@/lib/farms/constants";
import type { FarmDetail, FarmRecord } from "@/lib/farms/types";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  country: fallback(z.string(), "").default(""),
  crop: fallback(z.string(), "").default(""),
  status: fallback(z.enum(["", ...FARM_STATUSES]), "").default(""),
  sort: fallback(
    z.enum(["newest", "oldest", "name_asc", "name_desc", "area_desc", "area_asc"]),
    "newest",
  ).default("newest"),
  page: fallback(z.number().int(), 1).default(1),
});

const routeApi = getRouteApi("/_app/farms");

export const Route = createFileRoute("/_app/farms")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ ...search }),
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(
      farmsQueryOptions({
        q: deps.q, country: deps.country, crop: deps.crop,
        status: deps.status, sort: deps.sort, page: Math.max(1, deps.page),
      }),
    );
    void context.queryClient.ensureQueryData(farmStatsQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Farms — Nova Pro" },
      { name: "description", content: "Manage your farms, fields, crops, activities and documents from a single agricultural operations workspace." },
      { property: "og:title", content: "Farms — Nova Pro" },
      { property: "og:description", content: "Farm management, fields, crops, activities and documents on Nova Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FarmsPage,
});

function FarmsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FarmDetail | null>(null);

  return (
    <div>
      <PageHeader
        title="Farms"
        subtitle="Track farms, fields, crops, activities and documents in one place."
        icon={Sprout}
        actions={
          <Button className="gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" aria-hidden /> Register farm
          </Button>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <FarmsContent
          onEdit={(f) => { setEditing(f); setFormOpen(true); }}
        />
      </Suspense>
      <FarmFormDialog open={formOpen} onOpenChange={setFormOpen} farm={editing} />
    </div>
  );
}

function FarmsContent({ onEdit }: { onEdit: (f: FarmDetail) => void }) {
  const { filters, list, stats } = useFarmsList();
  const navigate = routeApi.useNavigate();
  const [detailId, setDetailId] = useState<string | null>(null);


  const countries = useMemo(() => {
    const s = new Set<string>();
    for (const f of list.items) if (f.country) s.add(f.country);
    return Array.from(s).sort();
  }, [list.items]);
  const crops = useMemo(() => {
    const s = new Set<string>();
    for (const f of list.items) for (const c of f.crops) s.add(c);
    return Array.from(s).sort();
  }, [list.items]);

  const totalPages = Math.max(1, Math.ceil(list.total / FARMS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total farms" value={String(stats.totalFarms)} icon={Sprout} />
        <StatCard label="Total hectares" value={stats.totalHectares > 0 ? stats.totalHectares.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"} icon={Ruler} tint="info" />
        <StatCard label="Fields tracked" value={String(stats.fieldsCount)} icon={Layers} tint="gold" />
        <StatCard label="Docs expiring (30d)" value={String(stats.expiringDocuments)} icon={AlertTriangle} tint={stats.expiringDocuments > 0 ? "danger" : "gold"} />
      </div>

      <FarmFiltersBar filters={filters} totalCount={list.total} countries={countries} crops={crops} />

      {list.items.length === 0 ? (
        <EmptyState onCreate={() => { onEdit({ id: "" } as FarmDetail); }} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.items.map((f: FarmRecord) => (
              <FarmCard key={f.id} farm={f} onOpen={(x) => setDetailId(x.id)} />
            ))}
          </div>
          {totalPages > 1 && (
            <nav aria-label="Farms pagination" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {(filters.page - 1) * FARMS_PAGE_SIZE + 1}–{Math.min(list.total, filters.page * FARMS_PAGE_SIZE)}
                </span> / {list.total}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline"
                  onClick={() => navigate({ to: ".", search: { ...filters, page: Math.max(1, filters.page - 1) } })}
                  disabled={filters.page <= 1}>
                  <ChevronLeft className="me-1 h-3 w-3" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {filters.page} of {totalPages}</span>
                <Button size="sm" variant="outline"
                  onClick={() => navigate({ to: ".", search: { ...filters, page: Math.min(totalPages, filters.page + 1) } })}
                  disabled={filters.page >= totalPages}>
                  Next <ChevronRight className="ms-1 h-3 w-3" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <FarmDetailSheet
        farmId={detailId}
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
        onEdit={(f) => { setDetailId(null); onEdit(f); }}
      />
    </div>
  );
}


function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Sprout className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No farms yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Register your first farm to start tracking fields, crops, activities and documents.
      </p>
      <Button className="mt-4 gap-1.5" onClick={onCreate}>
        <Plus className="h-4 w-4" /> Register farm
      </Button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
      </div>
    </div>
  );
}
