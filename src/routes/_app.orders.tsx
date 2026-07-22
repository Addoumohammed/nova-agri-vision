/**
 * Orders route — enterprise order management workspace.
 *
 * Presentation only. Every filter is URL-encoded; every mutation flows through
 * its dedicated hook so this file stays readable and testable.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog";
import { DeleteOrderDialog } from "@/components/orders/delete-order-dialog";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import { OrderFilters } from "@/components/orders/order-filters";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrderPagination } from "@/components/orders/order-pagination";
import { OrdersTable } from "@/components/orders/orders-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  counterpartiesQueryOptions,
  myCompaniesQueryOptions,
  ordersListQueryOptions,
  orderDetailQueryOptions,
  useOrdersList,
} from "@/hooks/use-orders-list";
import { useI18n } from "@/lib/i18n";
import { ORDERS_PAGE_SIZE } from "@/lib/orders/constants";
import type { OrderListItem, OrderRecord } from "@/lib/orders/types";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(
    z.enum(["all", "draft", "pending", "confirmed", "shipped", "delivered", "cancelled"]),
    "all",
  ).default("all"),
  role: fallback(z.enum(["all", "buyer", "supplier"]), "all").default("all"),
  sort: fallback(
    z.enum(["newest", "oldest", "total_desc", "total_asc", "eta_asc", "eta_desc"]),
    "newest",
  ).default("newest"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_app/orders")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    q: search.q, status: search.status, role: search.role, sort: search.sort, page: search.page,
  }),
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(myCompaniesQueryOptions);
    void context.queryClient.ensureQueryData(counterpartiesQueryOptions);
    void context.queryClient.ensureQueryData(
      ordersListQueryOptions({ ...deps, page: Math.max(1, deps.page) }),
    );
  },
  head: () => ({
    meta: [
      { title: "Orders — Nova Pro" },
      {
        name: "description",
        content:
          "Manage purchase orders end-to-end: create, confirm, ship, and track fulfilment across your buyers and suppliers.",
      },
      { property: "og:title", content: "Orders — Nova Pro" },
      {
        property: "og:description",
        content:
          "Manage purchase orders end-to-end: create, confirm, ship, and track fulfilment across your buyers and suppliers.",
      },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<WorkspaceSkeleton />}>
        <OrdersWorkspace />
      </Suspense>
    </div>
  );
}

function OrdersWorkspace() {
  const { t } = useI18n();
  const { filters, orders, myCompanies } = useOrdersList();
  const counterparties = useQuery(counterpartiesQueryOptions).data ?? [];

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<OrderListItem | OrderRecord | null>(null);
  const [deleting, setDeleting] = useState<OrderListItem | null>(null);

  const editingQ = useQuery({
    ...orderDetailQueryOptions(editingId ?? ""),
    enabled: Boolean(editingId),
  });

  const openDetail = useCallback((o: OrderListItem) => setDetailId(o.id), []);
  const openEditFromList = useCallback((o: OrderListItem) => setEditingId(o.id), []);
  const openEditFromDetail = useCallback((o: OrderRecord) => {
    setDetailId(null);
    setEditingId(o.id);
  }, []);
  const openCancel = useCallback((o: OrderListItem | OrderRecord) => setCancelling(o), []);
  const openDelete = useCallback((o: OrderListItem) => setDeleting(o), []);

  const hasFilters = Boolean(
    filters.q || filters.status !== "all" || filters.role !== "all" || filters.sort !== "newest",
  );
  const hasCompany = myCompanies.length > 0;

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title={t("orders.title")}
        subtitle={t("orders.subtitle")}
        actions={
          hasCompany && counterparties.length > 0 ? (
            <Button onClick={() => setCreating(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t("orders.new")}
            </Button>
          ) : undefined
        }
      />

      {!hasCompany ? (
        <NoCompanyEmpty />
      ) : (
        <>
          <OrderFilters filters={filters} totalCount={orders.total} />

          {orders.items.length === 0 ? (
            hasFilters ? <NoResultsEmpty /> : <EmptyState onCreate={() => setCreating(true)} />
          ) : (
            <div className="space-y-4">
              <OrdersTable
                orders={orders.items}
                onOpen={openDetail}
                onEditDraft={openEditFromList}
                onCancel={openCancel}
                onDelete={openDelete}
              />
              <OrderPagination
                page={orders.page}
                pageSize={ORDERS_PAGE_SIZE}
                total={orders.total}
              />
            </div>
          )}
        </>
      )}

      <OrderFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
        myCompanies={myCompanies}
        counterparties={counterparties}
      />

      <OrderFormDialog
        mode="edit"
        open={editingId !== null && Boolean(editingQ.data)}
        onOpenChange={(o) => !o && setEditingId(null)}
        order={editingQ.data ?? null}
        myCompanies={myCompanies}
        counterparties={counterparties}
      />

      <OrderDetailSheet
        orderId={detailId}
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
        onEditDraft={openEditFromDetail}
        onCancel={openCancel}
      />

      <CancelOrderDialog
        order={cancelling}
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
      />

      <DeleteOrderDialog
        order={deleting}
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
      <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold text-lg">{t("orders.empty.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("orders.empty.body")}</p>
      <Button onClick={onCreate} className="gap-1.5">
        <Plus className="h-4 w-4" /> {t("orders.empty.action")}
      </Button>
    </div>
  );
}

function NoResultsEmpty() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-2">
      <h2 className="font-semibold text-lg">{t("orders.emptyFilters.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("orders.emptyFilters.body")}</p>
    </div>
  );
}

function NoCompanyEmpty() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
      <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold text-lg">{t("orders.noCompany.title")}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {t("orders.noCompany.body")}
      </p>
      <Button asChild variant="outline">
        <Link to="/suppliers">{t("orders.noCompany.action")}</Link>
      </Button>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full max-w-md" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
