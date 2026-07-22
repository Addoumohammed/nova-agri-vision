/**
 * Supplier detail sheet — overview, contact info, stats, certifications,
 * and quick actions (contact, edit if mine).
 */
import { BadgeCheck, Building2, Globe, Loader2, Mail, MapPin, MessageSquare, Package, Pencil, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useSupplierDetail } from "@/hooks/use-suppliers-list";
import {
  formatCapacity,
  formatLeadTime,
  formatRating,
  supplierInitials,
} from "@/lib/suppliers/format";
import type { SupplierDetail } from "@/lib/suppliers/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  supplierId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onContact: (s: SupplierDetail) => void;
  onEdit: (s: SupplierDetail) => void;
}

export function SupplierDetailSheet({ supplierId, open, onOpenChange, onContact, onEdit }: Props) {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  const { data, isLoading } = useSupplierDetail(open ? supplierId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle>{data?.name ?? tr("suppliers.detail.overview")}</SheetTitle>
          <SheetDescription>{tr("suppliers.subtitle")}</SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        )}

        {!isLoading && data == null && (
          <p className="mt-6 text-sm text-muted-foreground">{tr("suppliers.error.notFound")}</p>
        )}

        {data && <Body data={data} onContact={onContact} onEdit={onEdit} tr={tr} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({ data, onContact, onEdit, tr }: {
  data: SupplierDetail;
  onContact: (s: SupplierDetail) => void;
  onEdit: (s: SupplierDetail) => void;
  tr: (k: string) => string;
}) {
  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-primary text-lg font-bold text-primary-foreground">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{supplierInitials(data.name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-lg font-semibold">{data.name}</h2>
            {data.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label={tr("suppliers.card.verified")} />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{[data.city, data.country].filter(Boolean).join(", ") || "—"}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-gold" aria-hidden />{formatRating(data.rating)}</span>
            <span className="capitalize">{tr(`suppliers.type.${data.type}`)}</span>
          </div>
          {data.isMine && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              <Building2 className="h-3 w-3" aria-hidden /> {tr("suppliers.detail.mine")}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={tr("suppliers.detail.products")} value={String(data.productsCount)} />
        <StatTile label={tr("suppliers.detail.orders")} value={String(data.ordersCount)} />
        <StatTile label={tr("suppliers.detail.activeContracts")} value={String(data.activeContractsCount)} />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {tr("suppliers.detail.overview")}
        </h3>
        <p className="text-sm text-foreground/90">
          {data.description || tr("suppliers.detail.noDescription")}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <KV label={tr("suppliers.card.capacity")} value={formatCapacity(data.monthlyCapacityMt)} />
          <KV label={tr("suppliers.card.leadTime")} value={formatLeadTime(data.leadTimeDays)} />
          <KV label={tr("suppliers.detail.employees")} value={data.employees ? String(data.employees) : "—"} />
          <KV label={tr("suppliers.detail.founded")} value={data.founded ? String(data.founded) : "—"} />
        </div>
      </section>

      {data.certifications.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tr("suppliers.detail.certifications")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.certifications.map((c) => (
              <span key={c} className="rounded-full border border-border bg-muted px-2 py-1 text-[11px]">{c}</span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {tr("suppliers.detail.contact")}
        </h3>
        <div className="space-y-2 text-sm">
          {data.website && (
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
              <Globe className="h-4 w-4" aria-hidden /><span className="truncate">{data.website}</span>
            </a>
          )}
          {data.email && (
            <a href={`mailto:${data.email}`} className="flex items-center gap-2 hover:underline">
              <Mail className="h-4 w-4" aria-hidden /><span className="truncate">{data.email}</span>
            </a>
          )}
          {data.phone && (
            <a href={`tel:${data.phone}`} className="flex items-center gap-2 hover:underline">
              <Phone className="h-4 w-4" aria-hidden />{data.phone}
            </a>
          )}
          {!data.website && !data.email && !data.phone && (
            <p className="text-muted-foreground text-xs">—</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        {data.isMine ? (
          <Button className="flex-1" onClick={() => onEdit(data)}>
            <Pencil className="me-2 h-4 w-4" aria-hidden /> {tr("suppliers.action.edit")}
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => onContact(data)}>
            <MessageSquare className="me-2 h-4 w-4" aria-hidden /> {tr("suppliers.action.contact")}
          </Button>
        )}
      </div>

      <div className="pt-2 text-[11px] text-muted-foreground">
        {tr("suppliers.detail.joined")}: {new Date(data.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="font-mono text-xl font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

// Re-exported for future async data loading UX
export { Loader2, Package };
