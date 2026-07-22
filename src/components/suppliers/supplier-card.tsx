/**
 * Supplier card — primary directory tile. Click opens details; nested
 * buttons short-circuit propagation for Contact.
 */
import { BadgeCheck, MapPin, MessageSquare, Package, Star, Timer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  formatCapacity,
  formatLeadTime,
  formatRating,
  supplierInitials,
} from "@/lib/suppliers/format";
import type { SupplierRecord } from "@/lib/suppliers/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  supplier: SupplierRecord;
  onOpen: (s: SupplierRecord) => void;
  onContact: (s: SupplierRecord) => void;
}

export function SupplierCard({ supplier, onOpen, onContact }: Props) {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  const [logoOk, setLogoOk] = useState(!!supplier.logoUrl);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4",
        "shadow-elegant transition hover:shadow-glow focus-within:ring-2 focus-within:ring-primary",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(supplier)}
        className="text-start"
        aria-label={`${tr("suppliers.action.view")} — ${supplier.name}`}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-primary text-primary-foreground font-bold">
            {supplier.logoUrl && logoOk ? (
              <img
                src={supplier.logoUrl}
                alt=""
                loading="lazy"
                onError={() => setLogoOk(false)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{supplierInitials(supplier.name)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold group-hover:text-primary">{supplier.name}</h3>
              {supplier.verified && (
                <BadgeCheck className="h-4 w-4 text-primary" aria-label={tr("suppliers.card.verified")} />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden />
              <span className="truncate">
                {[supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">
              {tr(`suppliers.type.${supplier.type}`)}
              {supplier.category && <span className="text-muted-foreground">· {supplier.category}</span>}
            </div>
          </div>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Metric icon={<Star className="h-3 w-3 text-gold" />} value={formatRating(supplier.rating)} />
        <Metric icon={<Package className="h-3 w-3 text-primary" />} value={String(supplier.productsCount)} suffix={tr("suppliers.card.products")} />
        <Metric icon={<Timer className="h-3 w-3 text-primary" />} value={formatLeadTime(supplier.leadTimeDays)} />
      </div>
      <div className="mt-2 text-center text-[11px] text-muted-foreground">
        {tr("suppliers.card.capacity")}: <span className="text-foreground">{formatCapacity(supplier.monthlyCapacityMt)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => onOpen(supplier)}>
          {tr("suppliers.action.view")}
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label={`${tr("suppliers.action.contact")} ${supplier.name}`}
          onClick={(e) => { e.stopPropagation(); onContact(supplier); }}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </article>
  );
}

function Metric({ icon, value, suffix }: { icon: React.ReactNode; value: string; suffix?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 py-1.5">
      <div className="inline-flex items-center gap-1 font-medium">{icon}{value}</div>
      {suffix && <div className="text-[10px] text-muted-foreground">{suffix}</div>}
    </div>
  );
}
