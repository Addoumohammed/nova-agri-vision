/**
 * Contact-supplier form orchestration. Isolates form state, validation, and
 * mutation lifecycle so the dialog stays presentational.
 */
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { contactSupplierAboutProduct } from "@/lib/marketplace.functions";
import {
  contactSupplierSchema,
  type ContactSupplierInput,
} from "@/lib/marketplace/schemas";
import { MAX_MESSAGE_LEN, MAX_SUBJECT_LEN } from "@/lib/marketplace/constants";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

export interface ContactFormState {
  subject: string;
  body: string;
}

export function initialContactForm(product: MarketplaceProduct): ContactFormState {
  return {
    subject: `Enquiry — ${product.name}`,
    body: "",
  };
}

export function useContactSupplier(product: MarketplaceProduct, onClose: () => void) {
  const [form, setForm] = useState<ContactFormState>(() => initialContactForm(product));
  const [fieldError, setFieldError] = useState<{ field?: keyof ContactFormState; message: string } | null>(null);
  const send = useServerFn(contactSupplierAboutProduct);

  const mutation = useMutation({
    mutationFn: send,
    onSuccess: () => {
      toast.success("Message sent", {
        description: `${product.supplier.name} was notified. They can reply from their inbox.`,
      });
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Could not send message", { description: err.message });
    },
  });

  const update = useCallback(<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
    const next =
      key === "subject" ? value.slice(0, MAX_SUBJECT_LEN) :
      key === "body"    ? value.slice(0, MAX_MESSAGE_LEN) :
      value;
    setForm((prev) => ({ ...prev, [key]: next }));
    setFieldError(null);
  }, []);

  const submit = useCallback(() => {
    setFieldError(null);
    const parsed = contactSupplierSchema.safeParse({
      productId: product.id,
      subject: form.subject.trim(),
      body: form.body.trim(),
    } satisfies ContactSupplierInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = (issue?.path[0] as keyof ContactFormState | undefined);
      setFieldError({ field, message: issue?.message ?? "Please check the form." });
      return;
    }
    mutation.mutate({ data: parsed.data });
  }, [form.body, form.subject, mutation, product.id]);

  return { form, update, submit, fieldError, isSubmitting: mutation.isPending };
}
