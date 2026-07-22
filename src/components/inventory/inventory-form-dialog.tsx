/**
 * Create / edit inventory row dialog. Supports barcode-driven product lookup
 * so operators can scan a code and populate the product picker in one motion.
 */
import { Loader2, ScanLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpsertInventory } from "@/hooks/use-inventory-mutations";
import { lookupProductByBarcode } from "@/lib/inventory.functions";
import { INVENTORY_UNITS } from "@/lib/inventory/constants";
import { upsertInventorySchema } from "@/lib/inventory/schemas";
import type { InventoryRecord, ProductLite, WarehouseRecord } from "@/lib/inventory/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row?: InventoryRecord | null;
  warehouses: WarehouseRecord[];
  products: ProductLite[];
}

interface FormState {
  warehouseId: string;
  productId: string;
  unit: string;
  quantity: string;
  reserved: string;
  lowStockThreshold: string;
  barcode: string;
}

function initial(row: InventoryRecord | null | undefined, warehouses: WarehouseRecord[]): FormState {
  return {
    warehouseId: row?.warehouseId ?? warehouses[0]?.id ?? "",
    productId: row?.productId ?? "",
    unit: row?.unit ?? "MT",
    quantity: row?.quantity != null ? String(row.quantity) : "0",
    reserved: row?.reserved != null ? String(row.reserved) : "0",
    lowStockThreshold: row?.lowStockThreshold != null ? String(row.lowStockThreshold) : "0",
    barcode: "",
  };
}

export function InventoryFormDialog({ open, onOpenChange, row, warehouses, products }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(() => initial(row, warehouses));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "root", string>>>({});
  const [scanning, setScanning] = useState(false);
  const lookup = useServerFn(lookupProductByBarcode);
  const mutation = useUpsertInventory(() => onOpenChange(false));

  useEffect(() => {
    if (open) {
      setForm(initial(row, warehouses));
      setErrors({});
    }
  }, [open, row, warehouses]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.productId) ?? null,
    [products, form.productId],
  );

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function scan() {
    if (!form.barcode.trim()) return;
    setScanning(true);
    try {
      const p = await lookup({ data: { barcode: form.barcode.trim() } });
      if (p) {
        set("productId", p.id);
        set("unit", p.unit);
        toast.success(t("inventory.barcode.found"));
      } else {
        toast.error(t("inventory.barcode.notFound"));
      }
    } finally {
      setScanning(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;

    const parsed = upsertInventorySchema.safeParse({
      id: row?.id,
      warehouseId: form.warehouseId,
      productId: form.productId,
      unit: form.unit,
      quantity: form.quantity === "" ? 0 : form.quantity,
      reserved: form.reserved === "" ? 0 : form.reserved,
      lowStockThreshold: form.lowStockThreshold === "" ? 0 : form.lowStockThreshold,
    });
    if (!parsed.success) {
      const fe: Partial<Record<keyof FormState | "root", string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormState | undefined;
        const msg = issue.message.startsWith("inventory.error.") ? t(issue.message as never) : issue.message;
        if (path) fe[path] = msg;
        else fe.root = msg;
      }
      setErrors(fe);
      return;
    }
    mutation.mutate(parsed.data);
  }

  const canSubmit = form.warehouseId && form.productId && !mutation.isPending;
  const noProducts = products.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? t("inventory.edit") : t("inventory.new")}</DialogTitle>
          <DialogDescription>{t("inventory.subtitle")}</DialogDescription>
        </DialogHeader>

        {noProducts ? (
          <p className="text-sm text-destructive">{t("inventory.error.noProducts")}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label={t("inventory.warehouse")} error={errors.warehouseId} required>
              <Select value={form.warehouseId} onValueChange={(v) => set("warehouseId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("inventory.barcode")}>
              <div className="flex gap-2">
                <Input
                  value={form.barcode}
                  onChange={(e) => set("barcode", e.target.value)}
                  placeholder={t("inventory.scanBarcode")}
                  autoComplete="off"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void scan(); } }}
                />
                <Button type="button" variant="outline" onClick={scan} disabled={scanning || !form.barcode.trim()} className="gap-1.5">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                </Button>
              </div>
            </Field>

            <Field label={t("inventory.product")} error={errors.productId} required>
              <Select value={form.productId} onValueChange={(v) => {
                set("productId", v);
                const p = products.find((x) => x.id === v);
                if (p) set("unit", p.unit);
              }}>
                <SelectTrigger><SelectValue placeholder={t("inventory.pickProduct")} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.sku ? ` — ${p.sku}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct?.barcode && (
                <p className="text-xs text-muted-foreground mt-1">{t("inventory.barcode")}: {selectedProduct.barcode}</p>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-4">
              <Field label={t("inventory.unit")} error={errors.unit}>
                <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVENTORY_UNITS.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("inventory.quantity")} error={errors.quantity} required>
                <Input type="number" inputMode="decimal" min="0" step="0.01" required
                  value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
              </Field>
              <Field label={t("inventory.reserved")} error={errors.reserved}>
                <Input type="number" inputMode="decimal" min="0" step="0.01"
                  value={form.reserved} onChange={(e) => set("reserved", e.target.value)} />
              </Field>
              <Field label={t("inventory.lowStockThreshold")} error={errors.lowStockThreshold}>
                <Input type="number" inputMode="decimal" min="0" step="0.01"
                  value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
              </Field>
            </div>

            {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                {t("inventory.cancel")}
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("inventory.save")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ms-1 text-destructive" aria-hidden>*</span>}
      </Label>
      {children}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
