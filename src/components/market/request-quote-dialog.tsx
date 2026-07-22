/**
 * Request-Quote dialog. Presentation only — form state, validation, and the
 * server-side mutation live in `useRequestQuote`.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRequestQuote } from "@/hooks/use-request-quote";
import { INCOTERMS, ORIGIN_COUNTRIES } from "@/lib/marketplace/constants";
import { formatPricePerUnit } from "@/lib/marketplace/format";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

interface Props {
  product: MarketplaceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestQuoteDialog({ product, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {product && (
          <RequestQuoteForm product={product} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RequestQuoteForm({ product, onClose }: { product: MarketplaceProduct; onClose: () => void }) {
  const { form, update, submit, fieldError, isSubmitting } = useRequestQuote(product, onClose);

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
        <DialogTitle>Request a quote</DialogTitle>
        <DialogDescription>
          {product.name} · {formatPricePerUnit(product.priceUsd, product.unit)} · from {product.supplier.name}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Quantity (${product.unit})`} error={fieldError?.field === "quantity" ? fieldError.message : undefined}>
          <Input
            type="number"
            inputMode="decimal"
            min={product.moq}
            step="any"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            aria-invalid={fieldError?.field === "quantity" || undefined}
            required
          />
        </Field>
        <Field
          label="Target price (USD)"
          error={fieldError?.field === "targetPrice" ? fieldError.message : undefined}
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="Optional"
            value={form.targetPrice}
            onChange={(e) => update("targetPrice", e.target.value)}
            aria-invalid={fieldError?.field === "targetPrice" || undefined}
          />
        </Field>
        <Field label="Incoterm">
          <Select value={form.incoterm} onValueChange={(v) => update("incoterm", v as typeof form.incoterm)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Destination">
          <Select
            value={form.destinationCountry || undefined}
            onValueChange={(v) => update("destinationCountry", v)}
          >
            <SelectTrigger><SelectValue placeholder="Choose country" /></SelectTrigger>
            <SelectContent>
              {ORIGIN_COUNTRIES.map((c) => (
                <SelectItem key={c.iso} value={c.iso}>{c.flag} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Destination port">
          <Input
            value={form.destinationPort}
            onChange={(e) => update("destinationPort", e.target.value)}
            placeholder="e.g. Rotterdam"
          />
        </Field>
        <Field label="Needed by">
          <Input
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Message to supplier (optional)">
        <Textarea
          rows={3}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="Packaging, delivery window, quality specs…"
          maxLength={2000}
        />
      </Field>

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
          Send request
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
