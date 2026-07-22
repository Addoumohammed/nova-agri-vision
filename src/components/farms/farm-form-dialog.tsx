/**
 * Farm form dialog — create or edit a farm record.
 */
import { Loader2, X } from "lucide-react";
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
import { useFarmMutations } from "@/hooks/use-farms";
import { upsertFarmSchema, type UpsertFarmInput } from "@/lib/farms/schemas";
import {
  FARM_STATUSES, IRRIGATION_TYPES, SOIL_TYPES,
} from "@/lib/farms/constants";
import type { FarmDetail } from "@/lib/farms/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  farm: FarmDetail | null;
  onSaved?: (id: string) => void;
}

function initial(farm: FarmDetail | null): Record<string, unknown> {
  if (!farm) {
    return {
      name: "", code: "", description: "", country: "", region: "", address: "",
      latitude: "", longitude: "", areaHectares: "",
      crops: [], certifications: [],
      soilType: "", irrigationType: "", status: "active" as const,
      contactName: "", contactPhone: "", contactEmail: "",
    };
  }
  return {
    id: farm.id,
    name: farm.name,
    code: farm.code ?? "",
    description: farm.description ?? "",
    country: farm.country ?? "",
    region: farm.region ?? "",
    address: farm.address ?? "",
    latitude: farm.latitude ?? "",
    longitude: farm.longitude ?? "",
    areaHectares: farm.areaHectares ?? "",
    crops: farm.crops,
    certifications: farm.certifications,
    soilType: farm.soilType ?? "",
    irrigationType: farm.irrigationType ?? "",
    status: farm.status,
    contactName: farm.contactName ?? "",
    contactPhone: farm.contactPhone ?? "",
    contactEmail: farm.contactEmail ?? "",
  };
}

export function FarmFormDialog({ open, onOpenChange, farm, onSaved }: Props) {
  const { saveFarm } = useFarmMutations();
  const [form, setForm] = useState<Record<string, unknown>>(() => initial(farm));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cropInput, setCropInput] = useState("");
  const [certInput, setCertInput] = useState("");

  useEffect(() => {
    if (open) { setForm(initial(farm)); setErrors({}); setCropInput(""); setCertInput(""); }
  }, [open, farm]);

  const isEdit = !!farm;
  const crops = (form.crops as string[]) ?? [];
  const certs = (form.certifications as string[]) ?? [];

  function set<K extends string>(k: K, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addCrop() {
    const v = cropInput.trim();
    if (!v || crops.includes(v)) return;
    set("crops", [...crops, v]); setCropInput("");
  }
  function addCert() {
    const v = certInput.trim();
    if (!v || certs.includes(v)) return;
    set("certifications", [...certs, v]); setCertInput("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = upsertFarmSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) {
        errs[String(iss.path[0])] = iss.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    const res = await saveFarm.mutateAsync({ data: parsed.data as UpsertFarmInput });
    onSaved?.(res.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit farm" : "Register a farm"}</DialogTitle>
          <DialogDescription>
            Add farm details to track fields, crops, activities and documents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Farm name *" error={errors.name}>
              <Input value={(form.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Farm code" hint="Internal reference">
              <Input value={(form.code as string) ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="FARM-001" />
            </Field>
            <Field label="Country (ISO 2)" error={errors.country}>
              <Input value={(form.country as string) ?? ""} onChange={(e) => set("country", e.target.value.toUpperCase())} maxLength={2} placeholder="US" />
            </Field>
            <Field label="Region / State">
              <Input value={(form.region as string) ?? ""} onChange={(e) => set("region", e.target.value)} />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <Input value={(form.address as string) ?? ""} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Total area (hectares)">
              <Input type="number" step="0.01" value={String(form.areaHectares ?? "")} onChange={(e) => set("areaHectares", e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={(form.status as string) ?? "active"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FARM_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Latitude">
              <Input type="number" step="0.0001" value={String(form.latitude ?? "")} onChange={(e) => set("latitude", e.target.value)} />
            </Field>
            <Field label="Longitude">
              <Input type="number" step="0.0001" value={String(form.longitude ?? "")} onChange={(e) => set("longitude", e.target.value)} />
            </Field>
            <Field label="Soil type">
              <Select value={(form.soilType as string) || "__none__"} onValueChange={(v) => set("soilType", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {SOIL_TYPES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Irrigation">
              <Select value={(form.irrigationType as string) || "__none__"} onValueChange={(v) => set("irrigationType", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {IRRIGATION_TYPES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Description" className="col-span-2">
            <Textarea rows={3} value={(form.description as string) ?? ""} onChange={(e) => set("description", e.target.value)} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <TagField
              label="Crops"
              tags={crops}
              value={cropInput}
              onChange={setCropInput}
              onAdd={addCrop}
              onRemove={(t) => set("crops", crops.filter((x) => x !== t))}
              placeholder="e.g. wheat"
            />
            <TagField
              label="Certifications"
              tags={certs}
              value={certInput}
              onChange={setCertInput}
              onAdd={addCert}
              onRemove={(t) => set("certifications", certs.filter((x) => x !== t))}
              placeholder="e.g. Organic"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Contact name">
              <Input value={(form.contactName as string) ?? ""} onChange={(e) => set("contactName", e.target.value)} />
            </Field>
            <Field label="Contact phone">
              <Input value={(form.contactPhone as string) ?? ""} onChange={(e) => set("contactPhone", e.target.value)} />
            </Field>
            <Field label="Contact email" error={errors.contactEmail}>
              <Input type="email" value={(form.contactEmail as string) ?? ""} onChange={(e) => set("contactEmail", e.target.value)} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saveFarm.isPending}>Cancel</Button>
            <Button type="submit" disabled={saveFarm.isPending} className="gap-2">
              {saveFarm.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create farm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}

function TagField({ label, tags, value, onChange, onAdd, onRemove, placeholder }: {
  label: string; tags: string[]; value: string; onChange: (v: string) => void;
  onAdd: () => void; onRemove: (t: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1 flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={onAdd}>Add</Button>
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {t}
              <button type="button" onClick={() => onRemove(t)} aria-label={`Remove ${t}`} className="hover:text-rose-500">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
