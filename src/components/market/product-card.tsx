/**
 * Product card — the primary marketplace surface. Fully accessible: the
 * whole card is a semantic button so keyboard users can open it with
 * Enter/Space, while nested "Quote"/"Contact" buttons stop propagation.
 */
import { BadgeCheck, MessageSquare, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPricePerUnit, formatQty, originLabel } from "@/lib/marketplace/format";
import type { MarketplaceProduct } from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

interface Props {
  product: MarketplaceProduct;
  onOpen: (product: MarketplaceProduct) => void;
  onRequestQuote: (product: MarketplaceProduct) => void;
  onContact: (product: MarketplaceProduct) => void;
}

export function ProductCard({ product, onOpen, onRequestQuote, onContact }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const cover = product.images[0];

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-elegant transition hover:shadow-glow focus-within:ring-2 focus-within:ring-primary",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted text-start"
        aria-label={`View details for ${product.name}`}
      >
        {cover && imgOk ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Sparkles className="h-8 w-8" aria-hidden />
          </div>
        )}
        {product.supplier.verified && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-1 text-[10px] font-semibold text-primary-foreground shadow">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            Verified
          </span>
        )}
        {product.certifications.length > 0 && (
          <span className="absolute end-3 top-3 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow">
            {product.certifications.length} cert{product.certifications.length > 1 ? "s" : ""}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpen(product)}
              className="text-start text-base font-semibold leading-tight hover:text-primary"
            >
              {product.name}
            </button>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Star className="h-3 w-3 text-gold" aria-hidden />
              {product.supplier.rating.toFixed(1)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {product.supplier.name} · {originLabel(product.originCountry)}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-lg font-bold text-foreground">
              {formatPricePerUnit(product.priceUsd, product.unit)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              MOQ {formatQty(product.moq, product.unit)} · Stock {formatQty(product.stock, product.unit)}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onRequestQuote(product);
            }}
          >
            Request quote
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label={`Contact ${product.supplier.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onContact(product);
            }}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}
