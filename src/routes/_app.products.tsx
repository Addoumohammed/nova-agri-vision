/**
 * Products route — supplier product management workspace.
 *
 * Presentation only. All data comes from `useProductsList`; mutations flow
 * through the product mutation hooks. URL search params encode every filter
 * so links are shareable and the back button is meaningful.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Package, Plus } from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductPagination } from "@/components/products/product-pagination";
import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  myCompaniesQueryOptions,
  myProductsQueryOptions,
  productCategoriesQueryOptions,
  useProductsList,
} from "@/hooks/use-products-list";
import { PRODUCTS_PAGE_SIZE } from "@/lib/products/constants";
import { useI18n } from "@/lib/i18n";
import type { ProductRecord } from "@/lib/products/types";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  status: fallback(z.enum(["all", "active", "inactive"]), "all").default("all"),
  companyId: fallback(z.string(), "").default(""),
  sort: fallback(
    z.enum(["newest", "oldest", "name_asc", "name_desc", "price_asc", "price_desc", "stock_asc", "stock_desc"]),
    "newest",
  ).default("newest"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_app/products")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    q: search.q,
    category: search.category,
    status: search.status,
    companyId: search.companyId,
    sort: search.sort,
    page: search.page,
  }),
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(productCategoriesQueryOptions);
    void context.queryClient.ensureQueryData(myCompaniesQueryOptions);
    void context.queryClient.ensureQueryData(
      myProductsQueryOptions({ ...deps, page: Math.max(1, deps.page) }),
    );
  },
  head: () => ({
    meta: [
      { title: "Products — Nova Pro" },
      {
        name: "description",
        content:
          "Manage your export catalog. Create, edit and publish products with live pricing, stock and images across Nova Pro.",
      },
      { property: "og:title", content: "Products — Nova Pro" },
      {
        property: "og:description",
        content:
          "Manage your export catalog. Create, edit and publish products with live pricing, stock and images across Nova Pro.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <Suspense fallback={<HeaderFallback />}>
        <ProductsWorkspace />
      </Suspense>
      <noscript>
        <p className="text-sm text-muted-foreground">
          {t("products.subtitle")}
        </p>
      </noscript>
    </div>
  );
}

function ProductsWorkspace() {
  const { t } = useI18n();
  const { filters, products, categories, companies } = useProductsList();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting] = useState<ProductRecord | null>(null);

  const openCreate = useCallback(() => setCreating(true), []);
  const openEdit = useCallback((p: ProductRecord) => setEditing(p), []);
  const openDelete = useCallback((p: ProductRecord) => setDeleting(p), []);

  const hasFilters = Boolean(
    filters.q || filters.category || filters.companyId ||
    filters.status !== "all" || filters.sort !== "newest",
  );
  const hasCompany = companies.length > 0;

  return (
    <>
      <PageHeader
        icon={Package}
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        actions={
          hasCompany ? (
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("products.new")}
            </Button>
          ) : undefined
        }
      />

      {!hasCompany ? (
        <NoCompanyEmpty />
      ) : (
        <>
          <ProductFilters
            filters={filters}
            categories={categories}
            companies={companies}
            totalCount={products.total}
          />

          {products.items.length === 0 ? (
            hasFilters ? <NoResultsEmpty /> : <EmptyCatalog onCreate={openCreate} />
          ) : (
            <div className="space-y-4">
              <ProductsTable
                products={products.items}
                onEdit={openEdit}
                onDelete={openDelete}
              />
              <ProductPagination
                page={products.page}
                pageSize={PRODUCTS_PAGE_SIZE}
                total={products.total}
              />
            </div>
          )}
        </>
      )}

      <ProductFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
        companies={companies}
        categories={categories}
      />
      <ProductFormDialog
        mode="edit"
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        product={editing}
        companies={companies}
        categories={categories}
      />
      <DeleteProductDialog
        product={deleting}
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

function EmptyCatalog({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
      <Package className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold text-lg">{t("products.empty.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("products.empty.body")}</p>
      <Button onClick={onCreate} className="gap-1.5">
        <Plus className="h-4 w-4" />
        {t("products.empty.action")}
      </Button>
    </div>
  );
}

function NoResultsEmpty() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-2">
      <h2 className="font-semibold text-lg">{t("products.emptyFilters.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("products.emptyFilters.body")}</p>
    </div>
  );
}

function NoCompanyEmpty() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
      <Package className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold text-lg">{t("products.noCompany.title")}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {t("products.noCompany.body")}
      </p>
      <Button asChild variant="outline">
        <Link to="/suppliers">{t("products.noCompany.action")}</Link>
      </Button>
    </div>
  );
}

function HeaderFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full max-w-md" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
