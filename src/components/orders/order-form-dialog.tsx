/**
 * Create / edit order dialog. Single form, two modes.
 *
 * - Drives buyer/supplier selection, live line items and pricing preview.
 * - Loads the selected supplier's product catalog for one-click add.
 * - Uses shared Zod schemas so client and server validation agree byte-for-byte.
 * - Blocks double-submit via mutation.isPending.
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOrder, useUpdateOrder } from "@/hooks/use-order-mutations";
import { supplierProductsQueryOptions } from "@/hooks/use-orders-list";
import { useI18n } from "@/lib/i18n";
import {
  MAX_INCOTERMS_LEN,
  MAX_ITEMS_PER_ORDER,
  MAX_NOTES_LEN,
} from "@/lib/orders/constants";
import { computePricing, formatMoney } from "@/lib/orders/format";
import { createOrderSchema, updateOrderSchema } from "@/lib/orders/schemas";
import type {
  OrderCounterparty, OrderRecord,
} from "@/lib/orders/types";

interface Props {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: OrderRecord | null;
  myCompanies: OrderCounterparty[];
  counterparties: OrderCounterparty[];
}

interface ItemRow {
  key: string;
  productId: string;
  name: string;
  quantity: string;
  unit: string;
  unitPriceUsd: string;
}

interface FormState {
  buyerCompanyId: string;
  supplierCompanyId: string;
  incoterms: string;
  notes: string;
  eta: string;
  discountPct: string;
  taxPct: string;
  items: ItemRow[];
}

const UNITS = ["MT", "KG", "TON", "LB", "BOX", "BAG", "PALLET", "CTN", "UNIT"];

let seed = 0;
const newKey = () => `row-${Date.now()}-${++seed}`;

function initial(order: OrderRecord | null | undefined, myCompanies: OrderCounterparty[]): FormState {
  if (order) {
    return {
      buyerCompanyId: order.buyerCompanyId,
      supplierCompanyId: order.supplierCompanyId,
      incoterms: order.incoterms ?? "",
      notes: order.notes ?? "",
      eta: order.eta ?? "",
      discountPct: String(order.discountPct ?? 0),
      taxPct: String(order.taxPct ?? 0),
      items: order.items.map((it) => ({
        key: newKey(),
        productId: it.productId ?? "",
        name: it.name,
        quantity: String(it.quantity),
        unit: it.unit,
        unitPriceUsd: String(it.unitPriceUsd),
      })),
    };
  }
  return {
    buyerCompanyId: myCompanies[0]?.id ?? "",
    supplierCompanyId: "",
    incoterms: "",
    notes: "",
    eta: "",
    discountPct: "0",
    taxPct: "0",
    items: [emptyRow()],
  };
}

function emptyRow(): ItemRow {
  return { key: newKey(), productId: "", name: "", quantity: "1", unit: "MT", unitPriceUsd: "0" };
}

export function OrderFormDialog({
  mode, open, onOpenChange, order, myCompanies, counterparties,
}: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(() => initial(order, myCompanies));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(initial(order, myCompanies));
      setErrors({});
    }
  }, [open, order, myCompanies]);

  const create = useCreateOrder(() => onOpenChange(false));
  const update = useUpdateOrder(() => onOpenChange(false));
  const isPending = create.isPending || update.isPending;

  const supplierProducts = useQuery(
    supplierProductsQueryOptions(mode === "create" ? form.supplierCompanyId : ""),
  );

  const pricing = useMemo(() => {
    return computePricing({
      items: form.items.map((r) => ({
        quantity: Number(r.quantity) || 0,
        unitPriceUsd: Number(r.unitPriceUsd) || 0,
      })),
      discountPct: Number(form.discountPct) || 0,
      taxPct: Number(form.taxPct) || 0,
    });
  }, [form.items, form.discountPct, form.taxPct]);

  const update_ = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const setItem = (key: string, patch: Partial<ItemRow>) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }));

  const removeItem = (key: string) =>
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((r) => r.key !== key) : f.items,
    }));

  const addItem = () =>
    setForm((f) =>
      f.items.length >= MAX_ITEMS_PER_ORDER ? f : { ...f, items: [...f.items, emptyRow()] },
    );

  const applyProduct = (key: string, productId: string) => {
    if (!productId) {
      setItem(key, { productId: "" });
      return;
    }
    const p = (supplierProducts.data ?? []).find((x) => x.id === productId);
    if (!p) return;
    setItem(key, {
      productId,
      name: p.name,
      unit: p.unit,
      unitPriceUsd: String(p.priceUsd),
      quantity: String(Math.max(1, p.moq || 1)),
    });
  };

  function build() {
    const items = form.items.map((r) => ({
      productId: r.productId || undefined,
      name: r.name.trim(),
      quantity: Number(r.quantity),
      unit: r.unit.trim() || "MT",
      unitPriceUsd: Number(r.unitPriceUsd),
    }));
    return {
      buyerCompanyId: form.buyerCompanyId,
      supplierCompanyId: form.supplierCompanyId,
      incoterms: form.incoterms.trim(),
      notes: form.notes.trim(),
      eta: form.eta,
      discountPct: Number(form.discountPct) || 0,
      taxPct: Number(form.taxPct) || 0,
      items,
    };
  }

  function submit(submitFlag: boolean) {
    setErrors({});
    if (mode === "edit" && order) {
      const payload = { id: order.id, ...build() };
      const parsed = updateOrderSchema.safeParse(payload);
      if (!parsed.success) {
        setErrors(zodErrs(parsed.error));
        return;
      }
      update.mutate(parsed.data);
      return;
    }
    const payload = { ...build(), submit: submitFlag };
    const parsed = createOrderSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodErrs(parsed.error));
      return;
    }
    create.mutate(parsed.data);
  }

  const supplierLocked = mode === "edit";
  const canPickProducts = mode === "create" && Boolean(form.supplierCompanyId);

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("orders.new") : t("orders.editDraft")}
          </DialogTitle>
          <DialogDescription>{t("orders.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Parties */}
          <section className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("orders.form.buyerCompany")}</Label>
              <Select
                value={form.buyerCompanyId}
                onValueChange={(v) => update_({ buyerCompanyId: v })}
                disabled={mode === "edit"}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {myCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.country ? ` · ${c.country}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.buyerCompanyId} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("orders.form.supplierCompany")}</Label>
              <Select
                value={form.supplierCompanyId}
                onValueChange={(v) => update_({ supplierCompanyId: v })}
                disabled={supplierLocked}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {counterparties.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.country ? ` · ${c.country}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.supplierCompanyId} />
            </div>
          </section>

          {/* Items */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("orders.items")}</Label>
              <Button
                type="button" size="sm" variant="outline" onClick={addItem}
                disabled={form.items.length >= MAX_ITEMS_PER_ORDER}
                className="gap-1 h-8"
              >
                <Plus className="h-3.5 w-3.5" /> {t("orders.item.add")}
              </Button>
            </div>

            <div className="rounded-xl border border-border divide-y divide-border">
              {form.items.map((row, idx) => (
                <div key={row.key} className="p-3 space-y-2">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_90px_90px_120px_36px] md:items-end">
                    <div className="space-y-1">
                      {canPickProducts ? (
                        <Select
                          value={row.productId || "__custom__"}
                          onValueChange={(v) => applyProduct(row.key, v === "__custom__" ? "" : v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t("orders.item.pickProduct")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__custom__">{t("orders.item.custom")}</SelectItem>
                            {(supplierProducts.data ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}{p.sku ? ` · ${p.sku}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        value={row.name}
                        onChange={(e) => setItem(row.key, { name: e.target.value.slice(0, 200) })}
                        placeholder={t("orders.item.name")}
                        aria-label={t("orders.item.name")}
                      />
                    </div>
                    <Input
                      type="number" inputMode="decimal" min="0" step="0.001"
                      value={row.quantity}
                      onChange={(e) => setItem(row.key, { quantity: e.target.value })}
                      aria-label={t("orders.item.quantity")}
                      placeholder={t("orders.item.quantity")}
                    />
                    <Select value={row.unit} onValueChange={(v) => setItem(row.key, { unit: v })}>
                      <SelectTrigger aria-label={t("orders.item.unit")}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" inputMode="decimal" min="0" step="0.01"
                      value={row.unitPriceUsd}
                      onChange={(e) => setItem(row.key, { unitPriceUsd: e.target.value })}
                      aria-label={t("orders.item.unitPrice")}
                      placeholder={t("orders.item.unitPrice")}
                    />
                    <Button
                      type="button" size="icon" variant="ghost"
                      onClick={() => removeItem(row.key)}
                      disabled={form.items.length <= 1}
                      aria-label={t("orders.item.remove")}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs">
                    <FieldError message={errors[`items.${idx}.name`] || errors[`items.${idx}.quantity`] || errors[`items.${idx}.unitPriceUsd`]} />
                    <span className="text-muted-foreground tabular-nums">
                      {t("orders.item.lineTotal")}:{" "}
                      <span className="font-medium text-foreground">
                        {formatMoney((Number(row.quantity) || 0) * (Number(row.unitPriceUsd) || 0))}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <FieldError message={errors["items"]} />
          </section>

          {/* Meta */}
          <section className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="incoterms">{t("orders.form.incoterms")}</Label>
              <Input
                id="incoterms"
                value={form.incoterms}
                onChange={(e) => update_({ incoterms: e.target.value.slice(0, MAX_INCOTERMS_LEN) })}
                placeholder="FOB / CIF / DAP…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eta">{t("orders.form.eta")}</Label>
              <Input
                id="eta" type="date"
                value={form.eta}
                onChange={(e) => update_({ eta: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
              />
              <FieldError message={errors.eta} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="discount">{t("orders.pricing.discountPct")}</Label>
                <Input
                  id="discount" type="number" min="0" max="100" step="0.01"
                  value={form.discountPct}
                  onChange={(e) => update_({ discountPct: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax">{t("orders.pricing.taxPct")}</Label>
                <Input
                  id="tax" type="number" min="0" max="100" step="0.01"
                  value={form.taxPct}
                  onChange={(e) => update_({ taxPct: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-1.5">
            <Label htmlFor="notes">{t("orders.form.notes")}</Label>
            <Textarea
              id="notes" rows={3}
              value={form.notes}
              onChange={(e) => update_({ notes: e.target.value.slice(0, MAX_NOTES_LEN) })}
            />
          </section>

          {/* Pricing preview */}
          <section className="rounded-xl bg-muted/40 border border-border p-3 grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("orders.pricing.subtotal")}</span>
            <span className="text-end tabular-nums">{formatMoney(pricing.subtotalUsd)}</span>
            <span className="text-muted-foreground">{t("orders.pricing.discount")}</span>
            <span className="text-end tabular-nums">−{formatMoney(pricing.discountUsd)}</span>
            <span className="text-muted-foreground">{t("orders.pricing.tax")}</span>
            <span className="text-end tabular-nums">{formatMoney(pricing.taxUsd)}</span>
            <span className="font-semibold pt-1 border-t border-border/60 mt-1">
              {t("orders.pricing.total")}
            </span>
            <span className="text-end font-semibold tabular-nums pt-1 border-t border-border/60 mt-1">
              {formatMoney(pricing.totalUsd)}
            </span>
          </section>

          {errors._root ? <FieldError message={errors._root} /> : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("products.cancel")}
          </Button>
          {mode === "create" ? (
            <>
              <Button variant="secondary" onClick={() => submit(false)} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("orders.form.saveDraft")}
              </Button>
              <Button onClick={() => submit(true)} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("orders.form.submit")}
              </Button>
            </>
          ) : (
            <Button onClick={() => submit(false)} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("orders.form.save")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function zodErrs(err: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length === 0 ? "_root" : issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
