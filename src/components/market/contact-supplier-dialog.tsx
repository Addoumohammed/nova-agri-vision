/**
 * Contact-Supplier dialog. Thin presentation over `useContactSupplier`.
 */
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContactSupplier } from "@/hooks/use-contact-supplier";
import { MAX_MESSAGE_LEN, MAX_SUBJECT_LEN } from "@/lib/marketplace/constants";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

interface Props {
  product: MarketplaceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactSupplierDialog({ product, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {product && (
          <ContactForm product={product} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({ product, onClose }: { product: MarketplaceProduct; onClose: () => void }) {
  const { form, update, submit, fieldError, isSubmitting } = useContactSupplier(product, onClose);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
      noValidate
    >
      <DialogHeader className="text-start">
        <DialogTitle>Contact {product.supplier.name}</DialogTitle>
        <DialogDescription>
          Message the supplier directly. They can respond from their Nova Pro inbox.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="contact-subject" className="text-xs font-medium">Subject</Label>
        <Input
          id="contact-subject"
          value={form.subject}
          onChange={(e) => update("subject", e.target.value)}
          maxLength={MAX_SUBJECT_LEN}
          aria-invalid={fieldError?.field === "subject" || undefined}
          required
        />
        {fieldError?.field === "subject" && (
          <p className="text-xs text-destructive">{fieldError.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-body" className="text-xs font-medium">Message</Label>
        <Textarea
          id="contact-body"
          rows={5}
          value={form.body}
          onChange={(e) => update("body", e.target.value)}
          maxLength={MAX_MESSAGE_LEN}
          placeholder="Tell the supplier what you're looking for — quantity, packaging, timing, destination…"
          aria-invalid={fieldError?.field === "body" || undefined}
          required
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{fieldError?.field === "body" && <span className="text-destructive">{fieldError.message}</span>}</span>
          <span>{form.body.length}/{MAX_MESSAGE_LEN}</span>
        </div>
      </div>

      {fieldError && !fieldError.field && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{fieldError.message}</span>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
          Send message
        </Button>
      </DialogFooter>
    </form>
  );
}
