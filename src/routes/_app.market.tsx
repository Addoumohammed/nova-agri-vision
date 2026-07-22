/**
 * Marketplace — the buyer-facing product catalog.
 *
 * Presentation layer only. All data flows through `useMarketplaceList`
 * (TanStack Query + router search params), all mutations through the
 * `useRequestQuote` / `useContactSupplier` hooks in `src/hooks/*`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useState } from "react";
import { Suspense } from "react";
import { z } from "zod";
import { ContactSupplierDialog } from "@/components/market/contact-supplier-dialog";
import { MarketFilters } from "@/components/market/market-filters";
import { MarketplaceEmpty } from "@/components/market/marketplace-empty";
import { MarketPagination } from "@/components/market/marketplace-pagination";
import { ProductCard } from "@/components/market/product-card";
import { ProductDetailSheet } from "@/components/market/product-detail-sheet";
import { RequestQuoteDialog } from "@/components/market/request-quote-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  categoriesQueryOptions,
  productsQueryOptions,
  useMarketplaceList,
} from "@/hooks/use-marketplace-list";
import { PAGE_SIZE } from "@/lib/marketplace/constants";
import { useI18n } from "@/lib/i18n";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  country: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(["relevance", "price_asc", "price_desc", "newest", "stock"]), "relevance").default("relevance"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_app/market")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    q: search.q,
    category: search.category,
    country: search.country,
    sort: search.sort,
    page: search.page,
  }),
  loader: ({ context, deps }) => {
    // Prime both queries; useSuspenseQuery reads them in the component.
    void context.queryClient.ensureQueryData(categoriesQueryOptions);
    void context.queryClient.ensureQueryData(
      productsQueryOptions({ ...deps, page: Math.max(1, deps.page) }),
    );
  },
  head: () => ({
    meta: [
      { title: "Marketplace — Nova Pro" },
      {
        name: "description",
        content:
          "Discover verified agricultural suppliers and products across origins, request quotes and message suppliers directly on Nova Pro.",
      },
      { property: "og:title", content: "Marketplace — Nova Pro" },
      {
        property: "og:description",
        content:
          "Discover verified agricultural suppliers and products across origins, request quotes and message suppliers directly on Nova Pro.",
      },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("marketplace.title")}</h1>
          <p className="text-muted-foreground">{t("marketplace.subtitle")}</p>
        </div>
      </header>

      <Suspense fallback={<MarketSkeleton />}>
        <MarketContent />
      </Suspense>
    </div>
  );
}

function MarketContent() {
  const { filters, products, categories } = useMarketplaceList();
  const [openProduct, setOpenProduct] = useState<MarketplaceProduct | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<MarketplaceProduct | null>(null);
  const [contactProduct, setContactProduct] = useState<MarketplaceProduct | null>(null);

  const openDetails = useCallback((p: MarketplaceProduct) => setOpenProduct(p), []);
  const openQuote = useCallback((p: MarketplaceProduct) => {
    setOpenProduct(null);
    setQuoteProduct(p);
  }, []);
  const openContact = useCallback((p: MarketplaceProduct) => {
    setOpenProduct(null);
    setContactProduct(p);
  }, []);

  const hasFilters = Boolean(filters.q || filters.category || filters.country || filters.sort !== "relevance");

  return (
    <>
      <MarketFilters filters={filters} categories={categories} totalCount={products.total} />

      {products.items.length === 0 ? (
        <MarketplaceEmpty
          hasFilters={hasFilters}
          onClear={() =>
            window.dispatchEvent(new CustomEvent("nova:market:clear"))
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.items.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpen={openDetails}
                onRequestQuote={openQuote}
                onContact={openContact}
              />
            ))}
          </div>
          <MarketPagination page={products.page} pageSize={PAGE_SIZE} total={products.total} />
        </>
      )}

      <ProductDetailSheet
        product={openProduct}
        open={openProduct !== null}
        onOpenChange={(o) => !o && setOpenProduct(null)}
        onRequestQuote={openQuote}
        onContact={openContact}
      />
      <RequestQuoteDialog
        product={quoteProduct}
        open={quoteProduct !== null}
        onOpenChange={(o) => !o && setQuoteProduct(null)}
      />
      <ContactSupplierDialog
        product={contactProduct}
        open={contactProduct !== null}
        onOpenChange={(o) => !o && setContactProduct(null)}
      />
    </>
  );
}

function MarketSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
