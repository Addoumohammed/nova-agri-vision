/**
 * Order detail sheet — shows parties, items, pricing, notes, timeline, and
 * status-transition actions gated by the caller's role + current status.
 */
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Suspense } from "react";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetOrderStatus } from "@/hooks/use-order-mutations";
import { orderDetailQueryOptions, orderTimelineQueryOptions } from "@/hooks/use-orders-list";
import { useI18n } from "@/lib/i18n";
import { allowedTransitions } from "@/lib/orders/constants";
import { formatMoney, formatQuantity } from "@/lib/orders/format";
import type { OrderRecord, OrderStatus } from "@/lib/orders/types";

interface Props {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditDraft: (o: OrderRecord) => void;
  onCancel: (o: OrderRecord) => void;
}

export function OrderDetailSheet({ orderId, open, onOpenChange, onEditDraft, onCancel }: Props) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("orders.details")}</SheetTitle>
          <SheetDescription>{t("orders.subtitle")}</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {orderId ? (
            <Suspense fallback={<DetailSkeleton />}>
              <DetailBody
                orderId={orderId}
                onEditDraft={onEditDraft}
                onCancel={onCancel}
                onClose={() => onOpenChange(false)}
              />
            </Suspense>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  orderId, onEditDraft, onCancel, onClose,
}: {
  orderId: string;
  onEditDraft: (o: OrderRecord) => void;
  onCancel: (o: OrderRecord) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "ar" ? "ar-EG" : "en-US";
  const detailQ = useQuery(orderDetailQueryOptions(orderId));
  const timelineQ = useQuery(orderTimelineQueryOptions(orderId));
  const setStatus = useSetOrderStatus();

  if (detailQ.isLoading || !detailQ.data) return <DetailSkeleton />;
  const order = detailQ.data;
  const events = timelineQ.data ?? [];

  const transitions = allowedTransitions(order.status, order.callerRole);
  const actionLabelKey: Partial<Record<OrderStatus, string>> = {
    pending:   "orders.action.submit",
    confirmed: "orders.action.confirm",
    shipped:   "orders.action.ship",
    delivered: "orders.action.deliver",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{order.orderNumber}</p>
          <p className="text-lg font-semibold">{formatMoney(order.totalUsd)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section>
        <SectionTitle>{t("orders.parties")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <PartyCard label={t("orders.buyer")} name={order.buyer?.name} country={order.buyer?.country} email={order.buyer?.email} />
          <PartyCard label={t("orders.supplier")} name={order.supplier?.name} country={order.supplier?.country} email={order.supplier?.email} />
        </div>
      </section>

      <section>
        <SectionTitle>{t("orders.items")}</SectionTitle>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2 text-start">{t("orders.item.name")}</th>
                <th className="px-3 py-2 text-end">{t("orders.item.quantity")}</th>
                <th className="px-3 py-2 text-end">{t("orders.item.unitPrice")}</th>
                <th className="px-3 py-2 text-end">{t("orders.item.lineTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{formatQuantity(it.quantity, it.unit, loc)}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{formatMoney(it.unitPriceUsd)}</td>
                  <td className="px-3 py-2 text-end tabular-nums font-medium">{formatMoney(it.totalUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border p-3 grid grid-cols-2 gap-y-1 text-sm">
        <span className="text-muted-foreground">{t("orders.pricing.subtotal")}</span>
        <span className="text-end tabular-nums">{formatMoney(order.subtotalUsd)}</span>
        <span className="text-muted-foreground">{t("orders.pricing.discount")} ({order.discountPct}%)</span>
        <span className="text-end tabular-nums">−{formatMoney(order.discountUsd)}</span>
        <span className="text-muted-foreground">{t("orders.pricing.tax")} ({order.taxPct}%)</span>
        <span className="text-end tabular-nums">{formatMoney(order.taxUsd)}</span>
        <Separator className="col-span-2 my-1" />
        <span className="font-semibold">{t("orders.pricing.total")}</span>
        <span className="text-end font-semibold tabular-nums">{formatMoney(order.totalUsd)}</span>
      </section>

      {order.incoterms || order.eta || order.notes ? (
        <section className="space-y-1 text-sm">
          {order.incoterms ? (
            <p><span className="text-muted-foreground">{t("orders.form.incoterms")}: </span>{order.incoterms}</p>
          ) : null}
          {order.eta ? (
            <p><span className="text-muted-foreground">{t("orders.form.eta")}: </span>{new Date(order.eta).toLocaleDateString(loc)}</p>
          ) : null}
          {order.notes ? (
            <div>
              <p className="text-muted-foreground">{t("orders.notes")}</p>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          ) : null}
          {order.cancelledReason ? (
            <div className="rounded-md bg-rose-500/5 border border-rose-500/20 p-2 text-rose-600 dark:text-rose-400">
              <p className="text-xs uppercase tracking-wide">{t("orders.cancelDialog.reason")}</p>
              <p>{order.cancelledReason}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <SectionTitle>{t("orders.timeline")}</SectionTitle>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("orders.timeline.empty")}</p>
        ) : (
          <ol className="relative border-s border-border ps-4 space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -start-[19px] top-1 grid h-3 w-3 place-items-center rounded-full bg-primary" aria-hidden>
                  <TimelineIcon status={ev.toStatus} />
                </span>
                <p className="text-sm">
                  <OrderStatusBadge status={ev.toStatus} />
                  {ev.note ? <span className="ms-2 text-muted-foreground">— {ev.note}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.changedAt).toLocaleString(loc)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Actions */}
      {(transitions.length > 0 || order.status === "draft") ? (
        <section className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          {order.status === "draft" ? (
            <Button variant="outline" onClick={() => onEditDraft(order)}>
              {t("orders.editDraft")}
            </Button>
          ) : null}
          {transitions
            .filter((s) => s !== "cancelled")
            .map((next) => (
              <Button
                key={next}
                onClick={() => setStatus.mutate({ id: order.id, status: next })}
                disabled={setStatus.isPending}
              >
                {t((actionLabelKey[next] ?? `orders.status.${next}`) as never)}
              </Button>
            ))}
          {transitions.includes("cancelled") ? (
            <Button
              variant="destructive"
              onClick={() => {
                onCancel(order);
                onClose();
              }}
            >
              {t("orders.action.cancel")}
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{children}</h3>;
}

function PartyCard({
  label, name, country, email,
}: { label: string; name?: string | null; country?: string | null; email?: string | null }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <div className="h-8 w-8 rounded-md bg-muted grid place-items-center" aria-hidden>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{name || "—"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {[country?.toUpperCase(), email].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineIcon({ status }: { status: OrderStatus }) {
  if (status === "delivered") return <CheckCircle2 className="h-2.5 w-2.5 text-white" />;
  if (status === "cancelled") return <XCircle className="h-2.5 w-2.5 text-white" />;
  return <Clock className="h-2.5 w-2.5 text-white" />;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
