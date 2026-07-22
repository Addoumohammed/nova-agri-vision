/**
 * Contact-supplier dialog — thin presentation over the mutation hook.
 */
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContactSupplierMutation } from "@/hooks/use-supplier-mutations";
import { contactSupplierSchema } from "@/lib/suppliers/schemas";
import { MAX_MESSAGE_LEN, MAX_SUBJECT_LEN } from "@/lib/suppliers/constants";
import type { SupplierRecord } from "@/lib/suppliers/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  supplier: SupplierRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactSupplierDialog({ supplier, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {supplier && (
          <ContactForm key={supplier.id} supplier={supplier} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({ supplier, onClose }: { supplier: SupplierRecord; onClose: () => void }) {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  const [subject, setSubject] = useState(`Inquiry — ${supplier.name}`);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<{ field?: "subject" | "body"; message: string } | null>(null);
  const mutation = useContactSupplierMutation(onClose);

  useEffect(() => { setErr(null); }, [subject, body]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contactSupplierSchema.safeParse({
      companyId: supplier.id,
      subject: subject.trim(),
      body: body.trim(),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = (issue?.path[0] as "subject" | "body" | undefined);
      setErr({ field, message: tr(issue?.message ?? "suppliers.error.bodyShort") });
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <DialogHeader className="text-start">
        <DialogTitle>{tr("suppliers.contact.title").replace("{name}", supplier.name)}</DialogTitle>
        <DialogDescription>{tr("suppliers.contact.desc")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="sup-subject" className="text-xs font-medium">{tr("suppliers.contact.subject")}</Label>
        <Input
          id="sup-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value.slice(0, MAX_SUBJECT_LEN))}
          maxLength={MAX_SUBJECT_LEN}
          aria-invalid={err?.field === "subject" || undefined}
          required
        />
        {err?.field === "subject" && <p className="text-xs text-destructive">{err.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sup-body" className="text-xs font-medium">{tr("suppliers.contact.body")}</Label>
        <Textarea
          id="sup-body"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_MESSAGE_LEN))}
          maxLength={MAX_MESSAGE_LEN}
          placeholder={tr("suppliers.contact.placeholder")}
          aria-invalid={err?.field === "body" || undefined}
          required
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{err?.field === "body" && <span className="text-destructive">{err.message}</span>}</span>
          <span>{body.length}/{MAX_MESSAGE_LEN}</span>
        </div>
      </div>

      {err && !err.field && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{err.message}</span>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          {tr("suppliers.action.cancel")}
        </Button>
        <Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending || undefined}>
          {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
          {mutation.isPending ? tr("suppliers.contact.sending") : tr("suppliers.action.send")}
        </Button>
      </DialogFooter>
    </form>
  );
}
