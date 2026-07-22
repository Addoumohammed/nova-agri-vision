/**
 * Document form — add or edit a farm document reference (URL-based).
 */
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFarmMutations } from "@/hooks/use-farms";
import { upsertDocumentSchema, type UpsertDocumentInput } from "@/lib/farms/schemas";
import { DOCUMENT_TYPES } from "@/lib/farms/constants";
import type { FarmDocument } from "@/lib/farms/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  farmId: string;
  doc: FarmDocument | null;
}

export function DocumentFormDialog({ open, onOpenChange, farmId, doc }: Props) {
  const { saveDocument } = useFarmMutations();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(doc ? {
      id: doc.id, farmId, title: doc.title, docType: doc.docType,
      url: doc.url ?? "", issuedAt: doc.issuedAt ?? "", expiresAt: doc.expiresAt ?? "",
    } : { farmId, title: "", docType: "certification", url: "", issuedAt: "", expiresAt: "" });
  }, [open, doc, farmId]);

  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = upsertDocumentSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    await saveDocument.mutateAsync({ data: parsed.data as UpsertDocumentInput });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{doc ? "Edit document" : "Add document"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title *" error={errors.title} className="md:col-span-2">
              <Input value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} required />
            </Field>
            <Field label="Type">
              <Select value={(form.docType as string) ?? "certification"} onValueChange={(v) => set("docType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="URL" error={errors.url}>
              <Input type="url" value={(form.url as string) ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Issued on">
              <Input type="date" value={(form.issuedAt as string) ?? ""} onChange={(e) => set("issuedAt", e.target.value)} />
            </Field>
            <Field label="Expires on">
              <Input type="date" value={(form.expiresAt as string) ?? ""} onChange={(e) => set("expiresAt", e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveDocument.isPending} className="gap-2">
              {saveDocument.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
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
