/**
 * Request-quote form orchestration. Owns local state, validation, and the
 * mutation lifecycle so the dialog stays purely presentational.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { requestQuoteFromProduct } from "@/lib/marketplace.functions";
import { requestQuoteSchema, type RequestQuoteInput } from "@/lib/marketplace/schemas";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

export interface QuoteFormState {
  quantity: string;
  targetPrice: string;
  incoterm: RequestQuoteInput["incoterm"];
  destinationCountry: string;
  destinationPort: string;
  message: string;
  deadline: string;
}

export function initialQuoteForm(product: MarketplaceProduct): QuoteFormState {
  return {
    quantity: String(product.moq),
    targetPrice: "",
    incoterm: "FOB",
    destinationCountry: "",
    destinationPort: "",
    message: "",
    deadline: "",
  };
}

export function useRequestQuote(product: MarketplaceProduct, onClose: () => void) {
  const [form, setForm] = useState<QuoteFormState>(() => initialQuoteForm(product));
  const [fieldError, setFieldError] = useState<{ field?: keyof QuoteFormState; message: string } | null>(null);
  const request = useServerFn(requestQuoteFromProduct);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: request,
    onSuccess: async (res) => {
      toast.success("Quote request sent", {
        description: `We opened RFQ #${res.rfqId.slice(0, 8).toUpperCase()} with the supplier.`,
        action: { label: "View RFQs", onClick: () => navigate({ to: "/rfq" }) },
      });
      await queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Could not send quote request", { description: err.message });
    },
  });

  const update = useCallback(<K extends keyof QuoteFormState>(key: K, value: QuoteFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldError(null);
  }, []);

  const submit = useCallback(() => {
    setFieldError(null);
    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setFieldError({ field: "quantity", message: "Enter a valid quantity above zero." });
      return;
    }
    if (qty < product.moq) {
      setFieldError({
        field: "quantity",
        message: `Minimum order quantity is ${product.moq} ${product.unit}.`,
      });
      return;
    }
    const target = form.targetPrice.trim() === "" ? undefined : Number(form.targetPrice);
    if (target !== undefined && (!Number.isFinite(target) || target <= 0)) {
      setFieldError({ field: "targetPrice", message: "Enter a valid target price or leave blank." });
      return;
    }
    const parsed = requestQuoteSchema.safeParse({
      productId: product.id,
      quantity: qty,
      unit: product.unit as RequestQuoteInput["unit"],
      targetPrice: target,
      incoterm: form.incoterm,
      destinationCountry: form.destinationCountry || undefined,
      destinationPort: form.destinationPort || undefined,
      message: form.message || undefined,
      deadline: form.deadline || undefined,
    });
    if (!parsed.success) {
      setFieldError({ message: parsed.error.issues[0]?.message ?? "Please check the form." });
      return;
    }
    mutation.mutate({ data: parsed.data });
  }, [form, mutation, product.id, product.moq, product.unit]);

  return { form, update, submit, fieldError, isSubmitting: mutation.isPending };
}
