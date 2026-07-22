/**
 * Create / edit warehouse dialog.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useUpsertWarehouse } from "@/hooks/use-inventory-mutations";
import { warehouseSchema } from "@/lib/inventory/schemas";
import type { WarehouseRecord } from "@/lib/inventory/types";
import type { OwnedCompany } from "@/lib/products/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  warehouse?: WarehouseRecord | null;
  companies: OwnedCompany[];
}

interface FormState {
  companyId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  capacityMt: string;
}

function initial(w: WarehouseRecord | null | undefined, companies: OwnedCompany[]): FormState {
  return {
    companyId: w?.companyId ?? companies[0]?.id ?? "",
    name: w?.name ?? "",
    address: w?.address ?? "",
    city: w?.city ?? "",
    country: w?.country ?? "",
    capacityMt: w?.capacityMt != null ? String(w.capacityMt) : "",
  };
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse, companies }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(() => initial(warehouse, companies));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "root", string>>>({});
  const mutation = useUpsertWarehouse(() => onOpenChange(false));

  useEffect(() => {
    if (open) { setForm(initial(warehouse, companies)); setErrors({}); }
  }, [open, warehouse, companies]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;
    const parsed = warehouseSchema.safeParse({
      id: warehouse?.id,
      companyId: form.companyId,
      name: form.name,
      address: form.address || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      capacityMt: form.capacityMt || undefined,
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

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{warehouse ? t("inventory.editWarehouse") : t("inventory.newWarehouse")}</DialogTitle>
          <DialogDescription>{t("inventory.warehouses")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {companies.length > 1 && (
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={form.companyId} onValueChange={(v) => set("companyId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t("inventory.warehouseName")}<span className="text-destructive ms-1" aria-hidden>*</span></Label>
            <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={140} required />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t("inventory.warehouseAddress")}</Label>
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.warehouseCity")}</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.warehouseCountry")}</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="EG" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.warehouseCapacity")}</Label>
              <Input type="number" inputMode="decimal" min="0" step="1"
                value={form.capacityMt} onChange={(e) => set("capacityMt", e.target.value)} />
            </div>
          </div>
          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t("inventory.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !form.name || !form.companyId}>
              {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("inventory.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
