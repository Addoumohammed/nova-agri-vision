import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  registerSchema,
  signUpWithPassword,
  type AuthErrorField,
  type AuthErrorKey,
  type RegisterInput,
} from "@/lib/auth/service";
import { useI18n } from "@/lib/i18n";

type Fields = RegisterInput;
type FieldKey = keyof Fields;
export type RegisterFieldErrors = Partial<Record<FieldKey | "form", string>>;

type UseRegisterFormOpts = {
  onSuccess: (result: { needsEmailConfirmation: boolean }) => void;
};

/**
 * Owns registration state, validation, focus management, and the submission
 * lifecycle. Delegates all side-effects to `lib/auth/service`.
 */
export function useRegisterForm({ onSuccess }: UseRegisterFormOpts) {
  const { t } = useI18n();

  const [fields, setFields] = useState<Fields>({
    name: "",
    company: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const refs: Record<FieldKey, React.RefObject<HTMLInputElement | null>> = {
    name: useRef<HTMLInputElement>(null),
    company: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirmPassword: useRef<HTMLInputElement>(null),
  };
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => refs.name.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = useCallback(
    (key: FieldKey) => (value: string) => {
      setFields((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) =>
        prev[key] || prev.form ? { ...prev, [key]: undefined, form: undefined } : prev,
      );
    },
    [],
  );

  const focusFirstError = useCallback(
    (e: RegisterFieldErrors) => {
      const order: FieldKey[] = ["name", "company", "email", "password", "confirmPassword"];
      for (const k of order) {
        if (e[k]) {
          refs[k].current?.focus();
          return;
        }
      }
    },
    [refs],
  );

  const applyServerError = useCallback(
    (key: AuthErrorKey, field?: AuthErrorField | "confirmPassword") => {
      const text = t(key);
      if (field) {
        const targetField = field as FieldKey;
        setErrors({ [targetField]: text });
        refs[targetField]?.current?.focus();
      } else {
        setErrors({ form: text });
      }
    },
    [refs, t],
  );

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (submittingRef.current) return;

      const parsed = registerSchema.safeParse(fields);
      if (!parsed.success) {
        const next: RegisterFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as FieldKey;
          // issue.message stores the i18n key (see zod schemas in service.ts)
          if (!next[key]) next[key] = t(issue.message as AuthErrorKey);
        }
        setErrors(next);
        focusFirstError(next);
        return;
      }

      submittingRef.current = true;
      setErrors({});
      setSubmitting(true);
      try {
        const result = await signUpWithPassword(parsed.data);
        if (!mountedRef.current) return;

        if (!result.ok) {
          applyServerError(result.error.key, result.error.field);
          return;
        }

        toast.success(
          result.needsEmailConfirmation ? t("auth.checkInbox") : t("auth.accountCreated"),
        );
        onSuccess({ needsEmailConfirmation: result.needsEmailConfirmation });
      } catch (err) {
        if (!mountedRef.current) return;
        applyServerError("auth.errors.network");
        if (import.meta.env.DEV) console.error("[register] unexpected error", err);
      } finally {
        if (mountedRef.current) {
          setSubmitting(false);
          submittingRef.current = false;
        }
      }
    },
    [applyServerError, fields, focusFirstError, onSuccess, t],
  );

  return {
    fields,
    errors,
    submitting,
    refs,
    setField,
    submit,
  };
}
