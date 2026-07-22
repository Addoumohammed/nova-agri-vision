/**
 * Supplier profile dialog — lets the caller upsert their own supplier
 * profile (company fields + `suppliers` extension row).
 */
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpsertSupplierMutation } from "@/hooks/use-supplier-mutations";
import { useMyCompanies } from "@/hooks/use-suppliers-list";
import {
  CERTIFICATIONS,
  SUPPLIER_CATEGORIES,
  SUPPLIER_COMPANY_TYPES,
} from "@/lib/suppliers/constants";
import { upsertSupplierProfileSchema } from "@/lib/suppliers/schemas";
import type { SupplierDetail } from "@/lib/suppliers/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When provided, prefills the form for editing that supplier. */
  supplier?: SupplierDetail | null;
}

interface FormState {
  companyId: string;
  type: "supplier" | "exporter" | "farm";
  country: string;
  city: string;
  website: string;
  email: string;
  phone: string;
  description: string;
  employees: string;
  founded: string;
  logoUrl: string;
  category: string;
  leadTimeDays: string;
  monthlyCapacityMt: string;
  certifications: string[];
}

const emptyForm: FormState = {
  companyId: "", type: "supplier", country: "", city: "", website: "",
  email: "", phone: "", description: "", employees: "", founded: "",
  logoUrl: "", category: "", leadTimeDays: "", monthlyCapacityMt: "",
  certifications: [],
};

export function SupplierProfileDialog({ open, onOpenChange, supplier }: Props) {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  const { data: myCompanies, isLoading } = useMyCompanies();
  const mutation = useUpsertSupplierMutation(() => onOpenChange(false));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [err, setErr] = useState<string | null>(null);

  // Seed form when opened.
  useEffect(() => {
    if (!open) return;
    if (supplier) {
      setForm({
        companyId: supplier.id,
        type: (supplier.type as FormState["type"]) ?? "supplier",
        country: supplier.country ?? "",
        city: supplier.city ?? "",
        website: supplier.website ?? "",
        email: supplier.email ?? "",
        phone: supplier.phone ?? "",
        description: supplier.description ?? "",
        employees: supplier.employees != null ? String(supplier.employees) : "",
        founded: supplier.founded != null ? String(supplier.founded) : "",
        logoUrl: supplier.logoUrl ?? "",
        category: supplier.category ?? "",
        leadTimeDays: supplier.leadTimeDays != null ? String(supplier.leadTimeDays) : "",
        monthlyCapacityMt: supplier.monthlyCapacityMt != null ? String(supplier.monthlyCapacityMt) : "",
        certifications: supplier.certifications ?? [],
      });
    } else if (myCompanies && myCompanies.length > 0) {
      setForm({ ...emptyForm, companyId: myCompanies[0].id });
    } else {
      setForm(emptyForm);
    }
    setErr(null);
  }, [open, supplier, myCompanies]);

  const ownedCompanies = useMemo(() => myCompanies ?? [], [myCompanies]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleCert = (c: string) =>
    setForm((f) => ({
      ...f,
      certifications: f.certifications.includes(c)
        ? f.certifications.filter((x) => x !== c)
        : [...f.certifications, c],
    }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = upsertSupplierProfileSchema.safeParse({
      companyId: form.companyId,
      type: form.type,
      country: form.country,
      city: form.city,
      website: form.website,
      email: form.email,
      phone: form.phone,
      description: form.description,
      employees: form.employees,
      founded: form.founded,
      logoUrl: form.logoUrl,
      category: form.category,
      leadTimeDays: form.leadTimeDays,
      monthlyCapacityMt: form.monthlyCapacityMt,
      certifications: form.certifications,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setErr(tr(issue?.message ?? "suppliers.toast.saveFailed"));
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-start">
          <DialogTitle>{tr("suppliers.profile.title")}</DialogTitle>
          <DialogDescription>{tr("suppliers.profile.desc")}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">…</div>
        ) : ownedCompanies.length === 0 && !supplier ? (
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {tr("suppliers.profile.noCompany")}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {!supplier && (
              <Field label={tr("suppliers.profile.pickCompany")}>
                <Select value={form.companyId} onValueChange={(v) => set("companyId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tr("suppliers.profile.pickCompanyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ownedCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tr("suppliers.profile.type")}>
                <Select value={form.type} onValueChange={(v) => set("type", v as FormState["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_COMPANY_TYPES.map((typeVal) => (
                      <SelectItem key={typeVal} value={typeVal}>{tr(`suppliers.type.${typeVal}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr("suppliers.profile.category")}>
                <Select value={form.category || "__none__"} onValueChange={(v) => set("category", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {SUPPLIER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr("suppliers.profile.country")}>
                <Input maxLength={2} value={form.country} onChange={(e) => set("country", e.target.value.toUpperCase())} placeholder="US" />
              </Field>
              <Field label={tr("suppliers.profile.city")}>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label={tr("suppliers.profile.website")}>
                <Input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
              </Field>
              <Field label={tr("suppliers.profile.email")}>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label={tr("suppliers.profile.phone")}>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label={tr("suppliers.profile.logoUrl")}>
                <Input type="url" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://" />
              </Field>
              <Field label={tr("suppliers.profile.employees")}>
                <Input type="number" min={0} value={form.employees} onChange={(e) => set("employees", e.target.value)} />
              </Field>
              <Field label={tr("suppliers.profile.founded")}>
                <Input type="number" min={1800} value={form.founded} onChange={(e) => set("founded", e.target.value)} />
              </Field>
              <Field label={tr("suppliers.profile.leadTime")}>
                <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} />
              </Field>
              <Field label={tr("suppliers.profile.monthlyCapacity")}>
                <Input type="number" min={0} step="0.1" value={form.monthlyCapacityMt} onChange={(e) => set("monthlyCapacityMt", e.target.value)} />
              </Field>
            </div>

            <Field label={tr("suppliers.profile.description")}>
              <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={tr("suppliers.profile.descriptionPlaceholder")} />
            </Field>

            <div>
              <Label className="text-xs font-medium">{tr("suppliers.profile.certifications")}</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CERTIFICATIONS.map((c) => {
                  const active = form.certifications.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleCert(c)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-accent",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {err && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{err}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                {tr("suppliers.action.cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending || !form.companyId} aria-busy={mutation.isPending || undefined}>
                {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
                {mutation.isPending ? tr("suppliers.profile.saving") : tr("suppliers.action.save")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
