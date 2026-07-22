/**
 * Suppliers directory — verified network of producers, exporters and farms.
 *
 * Layering:
 *   - Presentation: this file + `src/components/suppliers/*`
 *   - Business:      `src/hooks/use-suppliers-list.ts`, `use-supplier-mutations.ts`
 *   - Data:          `src/lib/suppliers.functions.ts` (RLS-scoped server fns)
 *   - Domain:        `src/lib/suppliers/{types,schemas,constants,format}.ts`
 */
import { Plus, Star, Users } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ContactSupplierDialog } from "@/components/suppliers/contact-supplier-dialog";
import { SupplierCard } from "@/components/suppliers/supplier-card";
import { SupplierDetailSheet } from "@/components/suppliers/supplier-detail-sheet";
import { SupplierFiltersBar } from "@/components/suppliers/supplier-filters";
import { SupplierProfileDialog } from "@/components/suppliers/supplier-profile-dialog";
import { SuppliersEmpty } from "@/components/suppliers/suppliers-empty";
import { SuppliersPagination } from "@/components/suppliers/suppliers-pagination";
import {
  suppliersQueryOptions,
  useSuppliersList,
} from "@/hooks/use-suppliers-list";
import { SUPPLIERS_PAGE_SIZE } from "@/lib/suppliers/constants";
import type {
  SupplierDetail,
  SupplierRecord,
} from "@/lib/suppliers/types";
import { useI18n } from "@/lib/i18n";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  country: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  verifiedOnly: fallback(z.boolean(), false).default(false),
  minRating: fallback(z.number(), 0).default(0),
  sort: fallback(
    z.enum(["newest", "oldest", "rating_desc", "rating_asc", "name_asc", "name_desc"]),
    "newest",
  ).default("newest"),
  page: fallback(z.number().int(), 1).default(1),
});

const routeApi = getRouteApi("/_app/suppliers");

export const Route = createFileRoute("/_app/suppliers")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ ...search }),
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(
      suppliersQueryOptions({
        q: deps.q,
        country: deps.country,
        category: deps.category,
        verifiedOnly: deps.verifiedOnly,
        minRating: deps.minRating,
        sort: deps.sort,
        page: Math.max(1, deps.page),
      }),
    );
  },
  head: () => ({
    meta: [
      { title: "Suppliers — Nova Pro" },
      { name: "description", content: "Browse verified agricultural suppliers, exporters and farms. Filter by origin, category and certification, then message them directly." },
      { property: "og:title", content: "Suppliers — Nova Pro" },
      { property: "og:description", content: "Browse verified agricultural suppliers, exporters and farms on Nova Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierDetail | null>(null);

  return (
    <div>
      <PageHeader
        title={tr("suppliers.title")}
        subtitle={tr("suppliers.subtitle")}
        icon={Users}
        actions={
          <Button
            className="gap-1.5"
            onClick={() => { setEditing(null); setProfileOpen(true); }}
          >
            <Plus className="h-4 w-4" aria-hidden /> {tr("suppliers.action.register")}
          </Button>
        }
      />

      <Suspense fallback={<PageSkeleton />}>
        <SuppliersContent
          onOpenProfileFor={(s) => { setEditing(s); setProfileOpen(true); }}
        />
      </Suspense>

      <SupplierProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        supplier={editing}
      />
    </div>
  );
}

function SuppliersContent({
  onOpenProfileFor,
}: {
  onOpenProfileFor: (s: SupplierDetail) => void;
}) {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  const { filters, list } = useSuppliersList();
  const navigate = routeApi.useNavigate();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [contact, setContact] = useState<SupplierRecord | null>(null);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const s of list.items) if (s.country) set.add(s.country);
    return Array.from(set).sort();
  }, [list.items]);

  const verifiedCount = list.items.filter((s) => s.verified).length;
  const avgRating = list.items.length
    ? list.items.reduce((sum, s) => sum + s.rating, 0) / list.items.length
    : 0;

  const hasFilters =
    !!filters.q || !!filters.country || !!filters.category ||
    filters.verifiedOnly || filters.minRating > 0 || filters.sort !== "newest";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={tr("suppliers.stats.total")} value={String(list.total)} icon={Users} />
        <StatCard label={tr("suppliers.stats.verified")} value={`${verifiedCount}/${list.items.length}`} icon={Users} tint="gold" />
        <StatCard label={tr("suppliers.stats.avgRating")} value={avgRating > 0 ? avgRating.toFixed(1) : "—"} icon={Star} tint="gold" />
        <StatCard label={tr("suppliers.stats.countries")} value={String(countries.length)} icon={Users} tint="info" />
      </div>

      <SupplierFiltersBar filters={filters} totalCount={list.total} countries={countries} />

      {list.items.length === 0 ? (
        <SuppliersEmpty
          hasFilters={hasFilters}
          onClear={() =>
            navigate({
              to: ".",
              search: { q: "", country: "", category: "", verifiedOnly: false, minRating: 0, sort: "newest", page: 1 },
            })
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.items.map((s) => (
              <SupplierCard
                key={s.id}
                supplier={s}
                onOpen={(x) => setDetailId(x.id)}
                onContact={(x) => setContact(x)}
              />
            ))}
          </div>
          <SuppliersPagination page={list.page} pageSize={SUPPLIERS_PAGE_SIZE} total={list.total} />
        </>
      )}

      <SupplierDetailSheet
        supplierId={detailId}
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
        onContact={(s) => setContact(s)}
        onEdit={(s) => { setDetailId(null); onOpenProfileFor(s); }}
      />

      <ContactSupplierDialog
        supplier={contact}
        open={contact !== null}
        onOpenChange={(o) => !o && setContact(null)}
      />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );
}
