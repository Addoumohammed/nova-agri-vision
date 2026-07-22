/**
 * Field form — create/edit a farm field.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFarmMutations } from "@/hooks/use-farms";
import { upsertFieldSchema, type UpsertFieldInput } from "@/lib/farms/schemas";
import { FIELD_STATUSES } from "@/lib/farms/constants";
import type { FarmField } from "@/lib/farms/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  farmId: string;
  field: FarmField | null;
}

export function FieldFormDialog({ open, onOpenChange, farmId, field }: Props) {
  const { saveField } = useFarmMutations();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(field ? {
      id: field.id, farmId,
      name: field.name,
      areaHectares: field.areaHectares ?? "",
      crop: field.crop ?? "", variety: field.variety ?? "",
      plantingDate: field.plantingDate ?? "",
      expectedHarvestDate: field.expectedHarvestDate ?? "",
      status: field.status, notes: field.notes ?? "",
    } : {
      farmId, name: "", areaHectares: "", crop: "", variety: "",
      plantingDate: "", expectedHarvestDate: "", status: "planned", notes: "",
    });
  }, [open, field, farmId]);

  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = upsertFieldSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    await saveField.mutateAsync({ data: parsed.data as UpsertFieldInput });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{field ? "Edit field" : "Add field"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Field name *" error={errors.name}>
              <Input value={(form.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Area (hectares)">
              <Input type="number" step="0.01" value={String(form.areaHectares ?? "")} onChange={(e) => set("areaHectares", e.target.value)} />
            </Field>
            <Field label="Crop">
              <Input value={(form.crop as string) ?? ""} onChange={(e) => set("crop", e.target.value)} placeholder="e.g. wheat" />
            </Field>
            <Field label="Variety">
              <Input value={(form.variety as string) ?? ""} onChange={(e) => set("variety", e.target.value)} />
            </Field>
            <Field label="Planting date">
              <Input type="date" value={(form.plantingDate as string) ?? ""} onChange={(e) => set("plantingDate", e.target.value)} />
            </Field>
            <Field label="Expected harvest">
              <Input type="date" value={(form.expectedHarvestDate as string) ?? ""} onChange={(e) => set("expectedHarvestDate", e.target.value)} />
            </Field>
            <Field label="Status" className="md:col-span-2">
              <Select value={(form.status as string) ?? "planned"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveField.isPending} className="gap-2">
              {saveField.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
