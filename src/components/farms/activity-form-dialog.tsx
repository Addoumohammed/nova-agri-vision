/**
 * Activity form — log or edit a farm operation.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFarmMutations } from "@/hooks/use-farms";
import { upsertActivitySchema, type UpsertActivityInput } from "@/lib/farms/schemas";
import { ACTIVITY_TYPES } from "@/lib/farms/constants";
import type { FarmActivity, FarmField } from "@/lib/farms/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  farmId: string;
  fields: FarmField[];
  activity: FarmActivity | null;
}

export function ActivityFormDialog({ open, onOpenChange, farmId, fields, activity }: Props) {
  const { saveActivity } = useFarmMutations();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    const today = new Date().toISOString().slice(0, 10);
    setForm(activity ? {
      id: activity.id, farmId,
      fieldId: activity.fieldId ?? "",
      activityType: activity.activityType,
      title: activity.title, notes: activity.notes ?? "",
      occurredAt: activity.occurredAt,
      cost: activity.cost ?? "", currency: activity.currency ?? "USD",
    } : {
      farmId, fieldId: "", activityType: "planting", title: "", notes: "",
      occurredAt: today, cost: "", currency: "USD",
    });
  }, [open, activity, farmId]);

  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = upsertActivitySchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    await saveActivity.mutateAsync({ data: parsed.data as UpsertActivityInput });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{activity ? "Edit activity" : "Log activity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Type *">
              <Select value={(form.activityType as string) ?? "planting"} onValueChange={(v) => set("activityType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date *">
              <Input type="date" value={(form.occurredAt as string) ?? ""} onChange={(e) => set("occurredAt", e.target.value)} required />
            </Field>
            <Field label="Title *" error={errors.title} className="md:col-span-2">
              <Input value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} required />
            </Field>
            <Field label="Field (optional)" className="md:col-span-2">
              <Select value={(form.fieldId as string) || "__none__"} onValueChange={(v) => set("fieldId", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Whole farm" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Whole farm</SelectItem>
                  {fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cost">
              <Input type="number" step="0.01" value={String(form.cost ?? "")} onChange={(e) => set("cost", e.target.value)} />
            </Field>
            <Field label="Currency">
              <Input value={(form.currency as string) ?? "USD"} maxLength={4} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveActivity.isPending} className="gap-2">
              {saveActivity.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
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
