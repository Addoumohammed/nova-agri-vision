/**
 * Enterprise orders table — responsive: table on md+, stacked cards on mobile.
 * Presentation only — every action bubbles up through callbacks.
 */
import { ArrowRight, Building2, Calendar, MoreHorizontal } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/orders/format";
import type { OrderListItem } from "@/lib/orders/types";

interface Props {
  orders: OrderListItem[];
  onOpen: (order: OrderListItem) => void;
  onEditDraft: (order: OrderListItem) => void;
  onCancel: (order: OrderListItem) => void;
  onDelete: (order: OrderListItem) => void;
}

function formatDate(iso: string | null, locale = "en-US") {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function OrdersTable({ orders, onOpen, onEditDraft, onCancel, onDelete }: Props) {
  const { t, locale } = useI18n();
  const loc = locale === "ar" ? "ar-EG" : "en-US";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Mobile — stacked cards */}
      <ul className="divide-y divide-border md:hidden">
        {orders.map((o) => (
          <li key={o.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onOpen(o)}
                  className="font-mono text-xs font-semibold text-primary hover:underline text-start"
                >
                  {o.orderNumber}
                </button>
                <p className="text-sm font-medium truncate">
                  {o.buyer?.name ?? "—"}
                  <span className="text-muted-foreground"> → </span>
                  {o.supplier?.name ?? "—"}
                </p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(o.eta, loc)}
              </span>
              <span className="font-semibold text-foreground">{formatMoney(o.totalUsd)}</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => onOpen(o)} className="gap-1">
                {t("orders.view")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <RowMenu
                order={o}
                onEditDraft={onEditDraft}
                onCancel={onCancel}
                onDelete={onDelete}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="text-start">
              <Th>{t("orders.number")}</Th>
              <Th>{t("orders.buyer")}</Th>
              <Th>{t("orders.supplier")}</Th>
              <Th className="text-center">{t("orders.items")}</Th>
              <Th className="text-end">{t("orders.pricing.total")}</Th>
              <Th>{t("orders.form.eta")}</Th>
              <Th>{t("orders.status")}</Th>
              <Th className="text-end">{t("orders.actions")}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onOpen(o)}
                    className="font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {o.orderNumber}
                  </button>
                  <div className="text-xs text-muted-foreground">{formatDate(o.createdAt, loc)}</div>
                </td>
                <td className="px-3 py-3">
                  <CompanyCell name={o.buyer?.name ?? "—"} country={o.buyer?.country} />
                </td>
                <td className="px-3 py-3">
                  <CompanyCell name={o.supplier?.name ?? "—"} country={o.supplier?.country} />
                </td>
                <td className="px-3 py-3 text-center tabular-nums">{o.itemsCount}</td>
                <td className="px-3 py-3 text-end font-semibold tabular-nums">
                  {formatMoney(o.totalUsd)}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{formatDate(o.eta, loc)}</td>
                <td className="px-3 py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onOpen(o)} className="gap-1 h-8">
                      {t("orders.view")}
                    </Button>
                    <RowMenu
                      order={o}
                      onEditDraft={onEditDraft}
                      onCancel={onCancel}
                      onDelete={onDelete}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-start text-xs font-medium uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function CompanyCell({ name, country }: { name: string; country: string | null | undefined }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-7 w-7 rounded-md bg-muted grid place-items-center shrink-0" aria-hidden>
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="font-medium truncate">{name}</div>
        {country ? <div className="text-xs text-muted-foreground uppercase">{country}</div> : null}
      </div>
    </div>
  );
}

function RowMenu({
  order, onEditDraft, onCancel, onDelete,
}: {
  order: OrderListItem;
  onEditDraft: (o: OrderListItem) => void;
  onCancel: (o: OrderListItem) => void;
  onDelete: (o: OrderListItem) => void;
}) {
  const { t } = useI18n();
  const canEdit = order.status === "draft";
  const canDelete = order.status === "draft";
  const canCancel = ["draft", "pending", "confirmed"].includes(order.status);
  const hasAny = canEdit || canDelete || canCancel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("orders.actions")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!hasAny ? (
          <DropdownMenuItem disabled>{t("orders.status." + order.status as never)}</DropdownMenuItem>
        ) : null}
        {canEdit ? (
          <DropdownMenuItem onClick={() => onEditDraft(order)}>
            {t("orders.editDraft")}
          </DropdownMenuItem>
        ) : null}
        {canCancel ? (
          <DropdownMenuItem onClick={() => onCancel(order)}>
            {t("orders.cancel")}
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(order)}
            >
              {t("orders.delete")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
