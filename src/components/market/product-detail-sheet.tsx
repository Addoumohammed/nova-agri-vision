/**
 * Product detail sheet. Presentational: takes a product, renders it, exposes
 * the two primary CTAs. All fetching / mutation lives in hooks / server fns.
 */
import { BadgeCheck, Building2, Globe2, Package, ShieldCheck, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPricePerUnit, formatQty, originLabel, relativeDay } from "@/lib/marketplace/format";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

interface Props {
  product: MarketplaceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestQuote: (product: MarketplaceProduct) => void;
  onContact: (product: MarketplaceProduct) => void;
}

export function ProductDetailSheet({ product, open, onOpenChange, onRequestQuote, onContact }: Props) {
  const [imgOk, setImgOk] = useState(true);
  if (!product) return null;
  const cover = product.images[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto sm:max-w-xl">
        <SheetHeader className="text-start">
          <SheetTitle className="text-2xl font-display">{product.name}</SheetTitle>
          <SheetDescription>
            {product.supplier.name} · {originLabel(product.originCountry)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
          {cover && imgOk ? (
            <img
              src={cover}
              alt={product.name}
              loading="eager"
              onError={() => setImgOk(false)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-10 w-10" aria-hidden />
            </div>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="Unit price">
            <span className="font-mono">{formatPricePerUnit(product.priceUsd, product.unit)}</span>
          </Stat>
          <Stat label="Min. order">{formatQty(product.moq, product.unit)}</Stat>
          <Stat label="In stock">{formatQty(product.stock, product.unit)}</Stat>
          <Stat label="Listed">{relativeDay(product.createdAt)}</Stat>
        </dl>

        {product.description && (
          <section className="mt-6">
            <h3 className="mb-1 text-sm font-semibold">Description</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-border bg-background/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4" aria-hidden />
            Supplier
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 font-medium">
                {product.supplier.name}
                {product.supplier.verified && (
                  <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified supplier" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <Globe2 className="me-1 inline h-3 w-3" aria-hidden />
                {[product.supplier.city, originLabel(product.supplier.country)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold">
              <Star className="h-3 w-3 text-gold" aria-hidden />
              {product.supplier.rating.toFixed(1)}
            </span>
          </div>
        </section>

        {product.certifications.length > 0 && (
          <section className="mt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Certifications
            </h3>
            <ul className="flex flex-wrap gap-2">
              {product.certifications.map((c) => (
                <li
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  <BadgeCheck className="h-3 w-3 text-primary" aria-hidden />
                  <span className="font-medium">{c.certType}</span>
                  {c.issuer && <span className="text-muted-foreground">· {c.issuer}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <SheetFooter className="mt-6 flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => onRequestQuote(product)}>
            Request quote
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onContact(product)}>
            Contact supplier
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{children}</dd>
    </div>
  );
}
