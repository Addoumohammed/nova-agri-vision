/**
 * Create / edit product dialog. Single form, two modes.
 * - Validation: shared Zod schemas (client === server).
 * - Autofocus & keyboard ergonomics.
 * - Double-submit guard via mutation.isPending.
 * - Resets internal state whenever `product` changes.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProductImagesEditor } from "@/components/products/product-images-editor";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-product-mutations";
import { useI18n } from "@/lib/i18n";
import { PRODUCT_UNITS } from "@/lib/products/constants";
import { createProductSchema, updateProductSchema } from "@/lib/products/schemas";
import type { OwnedCompany, ProductCategoryLite, ProductRecord } from "@/lib/products/types";

interface Props {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductRecord | null;
  companies: OwnedCompany[];
  categories: ProductCategoryLite[];
}

interface FormState {
  companyId: string;
  name: string;
  sku: string;
  categoryId: string;
  originCountry: string;
  unit: string;
  priceUsd: string;
  moq: string;
  stock: string;
  description: string;
  images: string[];
  active: boolean;
}

const NONE = "__none__";

function initialState(product: ProductRecord | null | undefined, companies: OwnedCompany[]): FormState {
  return {
    companyId: product?.supplierCompanyId ?? companies[0]?.id ?? "",
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? "",
    originCountry: product?.originCountry ?? "",
    unit: product?.unit ?? "MT",
    priceUsd: product?.priceUsd != null ? String(product.priceUsd) : "",
    moq: product?.moq != null ? String(product.moq) : "1",
    stock: product?.stock != null ? String(product.stock) : "0",
    description: product?.description ?? "",
    images: product?.images ?? [],
    active: product?.active ?? true,
  };
}

export function ProductFormDialog({
  mode, open, onOpenChange, product, companies, categories,
}: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(() => initialState(product, companies));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "root", string>>>({});

  const create = useCreateProduct(() => onOpenChange(false));
  const update = useUpdateProduct(() => onOpenChange(false));
  const isPending = create.isPending || update.isPending;

  // Reset whenever the dialog opens with a different product.
  useEffect(() => {
    if (open) {
      setForm(initialState(product, companies));
      setErrors({});
    }
  }, [open, product, companies]);

  const title = mode === "edit" ? t("products.edit") : t("products.new");

  const canSubmit = useMemo(
    () => form.companyId && form.name.trim().length >= 2 && form.priceUsd !== "" && !isPending,
    [form.companyId, form.name, form.priceUsd, isPending],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    const raw = {
      companyId: form.companyId,
      name: form.name,
      sku: form.sku || undefined,
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      originCountry: form.originCountry || undefined,
      unit: form.unit,
      priceUsd: form.priceUsd,
      moq: form.moq === "" ? 0 : form.moq,
      stock: form.stock === "" ? 0 : form.stock,
      images: form.images,
      active: form.active,
    };

    const schema = mode === "edit" ? updateProductSchema : createProductSchema;
    const parsed = mode === "edit"
      ? schema.safeParse({ ...raw, id: product?.id })
      : schema.safeParse(raw);

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState | "root", string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormState | undefined;
        const msg = issue.message.startsWith("products.error.")
          ? t(issue.message as never)
          : issue.message;
        if (path) fieldErrors[path] = msg;
        else fieldErrors.root = msg;
      }
      setErrors(fieldErrors);
      return;
    }

    if (mode === "edit") {
      update.mutate(parsed.data as never);
    } else {
      create.mutate(parsed.data as never);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("products.subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {companies.length > 1 && (
            <Field label={t("products.company")} error={errors.companyId}>
              <Select value={form.companyId} onValueChange={(v) => set("companyId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("products.name")} error={errors.name} required>
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={140}
                required
                aria-invalid={!!errors.name}
              />
            </Field>
            <Field label={t("products.sku")} error={errors.sku}>
              <Input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value.toUpperCase())}
                maxLength={64}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("products.category")} error={errors.categoryId}>
              <Select
                value={form.categoryId || NONE}
                onValueChange={(v) => set("categoryId", v === NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder={t("products.uncategorised")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("products.uncategorised")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("products.origin")} error={errors.originCountry}>
              <Input
                value={form.originCountry}
                onChange={(e) => set("originCountry", e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                placeholder="EG"
                autoComplete="country"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label={t("products.unit")} error={errors.unit}>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("products.price")} error={errors.priceUsd} required>
              <Input
                type="number" inputMode="decimal" min="0" step="0.01" required
                value={form.priceUsd}
                onChange={(e) => set("priceUsd", e.target.value)}
                aria-invalid={!!errors.priceUsd}
              />
            </Field>
            <Field label={t("products.moq")} error={errors.moq}>
              <Input
                type="number" inputMode="decimal" min="0" step="0.01"
                value={form.moq}
                onChange={(e) => set("moq", e.target.value)}
              />
            </Field>
            <Field label={t("products.stock")} error={errors.stock}>
              <Input
                type="number" inputMode="decimal" min="0" step="0.01"
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </Field>
          </div>

          <Field label={t("products.description")} error={errors.description}>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              maxLength={4000}
            />
          </Field>

          <div>
            <Label className="mb-2 block">{t("products.images")}</Label>
            <ProductImagesEditor
              value={form.images}
              onChange={(imgs) => set("images", imgs)}
              error={errors.images}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="product-active"
              checked={form.active}
              onCheckedChange={(v) => set("active", Boolean(v))}
            />
            <Label htmlFor="product-active" className="text-sm">
              {form.active ? t("products.published") : t("products.hidden")}
            </Label>
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-destructive">{errors.root}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("products.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("products.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, error, required, children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
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
