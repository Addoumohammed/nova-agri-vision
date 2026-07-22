/**
 * Inventory route — warehouse and stock command center.
 *
 * Presentation only. All data comes from `useInventoryList`; mutations flow
 * through their dedicated hooks. Every filter is URL-encoded for shareable
 * links and back-button friendliness.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Boxes, Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { DeleteInventoryDialog } from "@/components/inventory/delete-inventory-dialog";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryFormDialog } from "@/components/inventory/inventory-form-dialog";
import { InventoryPagination } from "@/components/inventory/inventory-pagination";
import { InventoryStatsCards } from "@/components/inventory/inventory-stats";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { StockMovementsSheet } from "@/components/inventory/stock-movements-sheet";
import { TransferStockDialog } from "@/components/inventory/transfer-stock-dialog";
import { WarehousesSheet } from "@/components/inventory/warehouses-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  inventoryQueryOptions,
  inventoryStatsQueryOptions,
  myProductsLiteQueryOptions,
  myWarehousesQueryOptions,
  useInventoryList,
} from "@/hooks/use-inventory-list";
import { myCompaniesQueryOptions } from "@/hooks/use-products-list";
import { INVENTORY_PAGE_SIZE } from "@/lib/inventory/constants";
import type { InventoryRecord } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  warehouseId: fallback(z.string(), "").default(""),
  status: fallback(z.enum(["all", "in_stock", "low", "out"]), "all").default("all"),
  sort: fallback(
    z.enum([
      "newest","oldest","product_asc","product_desc",
      "quantity_asc","quantity_desc","available_asc","available_desc",
    ]),
    "newest",
  ).default("newest"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_app/inventory")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    q: search.q,
    warehouseId: search.warehouseId,
    status: search.status,
    sort: search.sort,
    page: search.page,
  }),
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(myCompaniesQueryOptions);
    void context.queryClient.ensureQueryData(myWarehousesQueryOptions);
    void context.queryClient.ensureQueryData(myProductsLiteQueryOptions);
    void context.queryClient.ensureQueryData(inventoryStatsQueryOptions);
    void context.queryClient.ensureQueryData(
      inventoryQueryOptions({ ...deps, page: Math.max(1, deps.page) }),
    );
  },
  head: () => ({
    meta: [
      { title: "Inventory — Nova Pro" },
      {
        name: "description",
        content:
          "Track stock across every warehouse in real time. Adjust, transfer and audit inventory with a full movement ledger inside Nova Pro.",
      },
      { property: "og:title", content: "Inventory — Nova Pro" },
      {
        property: "og:description",
        content:
          "Track stock across every warehouse in real time. Adjust, transfer and audit inventory with a full movement ledger inside Nova Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <Suspense fallback={<InventoryFallback />}>
        <InventoryWorkspace />
      </Suspense>
      <noscript>
        <p className="text-sm text-muted-foreground">{t("inventory.subtitle")}</p>
      </noscript>
    </div>
  );
}

function InventoryWorkspace() {
  const { t } = useI18n();
  const { filters, inventory, warehouses, products, stats } = useInventoryList();
  // Companies come from the products layer (owner scope is identical: caller-owned).
  const companies = Array.from(
    new Map(warehouses.map((w) => [w.companyId, {
      id: w.companyId, name: w.companyName ?? "My company",
      slug: null, country: w.country, verified: false,
    }])).values(),
  );

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InventoryRecord | null>(null);
  const [adjusting, setAdjusting] = useState<InventoryRecord | null>(null);
  const [transferring, setTransferring] = useState<InventoryRecord | null>(null);
  const [historyFor, setHistoryFor] = useState<InventoryRecord | null>(null);
  const [deleting, setDeleting] = useState<InventoryRecord | null>(null);
  const [warehousesOpen, setWarehousesOpen] = useState(false);

  const openCreate = useCallback(() => setCreating(true), []);
  const openEdit = useCallback((r: InventoryRecord) => setEditing(r), []);
  const openAdjust = useCallback((r: InventoryRecord) => setAdjusting(r), []);
  const openTransfer = useCallback((r: InventoryRecord) => setTransferring(r), []);
  const openHistory = useCallback((r: InventoryRecord) => setHistoryFor(r), []);
  const openDelete = useCallback((r: InventoryRecord) => setDeleting(r), []);

  const hasWarehouses = warehouses.length > 0;
  const hasCompany = companies.length > 0 || hasWarehouses;
  const hasFilters = Boolean(
    filters.q || filters.warehouseId ||
    filters.status !== "all" || filters.sort !== "newest",
  );

  return (
    <>
      <PageHeader
        icon={Boxes}
        title={t("inventory.title")}
        subtitle={t("inventory.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setWarehousesOpen(true)} className="gap-1.5">
              <WarehouseIcon className="h-4 w-4" />
              {t("inventory.warehouses")}
            </Button>
            {hasWarehouses && (
              <Button onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" />
                {t("inventory.new")}
              </Button>
            )}
          </div>
        }
      />

      <InventoryStatsCards stats={stats} />

      {!hasCompany ? (
        <NoCompanyEmpty />
      ) : !hasWarehouses ? (
        <NoWarehouseEmpty onCreate={() => setWarehousesOpen(true)} />
      ) : (
        <>
          <InventoryFilters
            filters={filters}
            warehouses={warehouses}
            totalCount={inventory.total}
          />
          {inventory.items.length === 0 ? (
            hasFilters ? <NoResultsEmpty /> : <EmptyInventory onCreate={openCreate} />
          ) : (
            <div className="space-y-4">
              <InventoryTable
                rows={inventory.items}
                onEdit={openEdit}
                onAdjust={openAdjust}
                onTransfer={openTransfer}
                onHistory={openHistory}
                onDelete={openDelete}
              />
              <InventoryPagination
                page={inventory.page}
                pageSize={INVENTORY_PAGE_SIZE}
                total={inventory.total}
              />
            </div>
          )}
        </>
      )}

      <InventoryFormDialog
        open={creating}
        onOpenChange={setCreating}
        warehouses={warehouses}
        products={products}
      />
      <InventoryFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        row={editing}
        warehouses={warehouses}
        products={products}
      />
      <AdjustStockDialog
        open={adjusting !== null}
        onOpenChange={(o) => !o && setAdjusting(null)}
        row={adjusting}
      />
      <TransferStockDialog
        open={transferring !== null}
        onOpenChange={(o) => !o && setTransferring(null)}
        row={transferring}
        warehouses={warehouses}
      />
      <StockMovementsSheet
        open={historyFor !== null}
        onOpenChange={(o) => !o && setHistoryFor(null)}
        row={historyFor}
      />
      <DeleteInventoryDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        row={deleting}
      />
      <WarehousesSheet
        open={warehousesOpen}
        onOpenChange={setWarehousesOpen}
        warehouses={warehouses}
        companies={companies}
      />
    </>
  );
}

function EmptyInventory({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
      <Boxes className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold text-lg">{t("inventory.empty.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("inventory.empty.body")}</p>
      <Button onClick={onCreate} className="gap-1.5">
        <Plus className="h-4 w-4" />
        {t("inventory.empty.action")}
      </Button>
    </div>
  );
}

function NoResultsEmpty() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-2">
      <h2 className="font-semibold text-lg">{t("inventory.emptyFilters.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("inventory.emptyFilters.body")}</p>
    </div>
  );
}

function NoWarehouseEmpty({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
      <WarehouseIcon className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold text-lg">{t("inventory.noWarehouse.title")}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {t("inventory.noWarehouse.body")}
      </p>
      <Button onClick={onCreate} className="gap-1.5">
        <Plus className="h-4 w-4" />
        {t("inventory.noWarehouse.action")}
      </Button>
    </div>
  );
}

function NoCompanyEmpty() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
      <WarehouseIcon className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold text-lg">{t("inventory.noCompany.title")}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {t("inventory.noCompany.body")}
      </p>
      <Button asChild variant="outline">
        <Link to="/suppliers">{t("inventory.noCompany.action")}</Link>
      </Button>
    </div>
  );
}

function InventoryFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full max-w-md" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
