import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  loginSchema,
  rememberedEmail,
  safeRedirect,
  sendPasswordReset,
  signInWithPassword,
  type AuthErrorField,
  type AuthErrorKey,
} from "@/lib/auth/service";
import { useI18n } from "@/lib/i18n";

export type LoginFieldErrors = Partial<Record<AuthErrorField | "form", string>>;

type UseLoginFormOpts = {
  redirectTo: string;
  onSuccess: (redirectTo: string) => void;
};

/**
 * Business logic for the login form. Owns state, validation, submission
 * lifecycle and the forgot-password side-flow — leaving the route component
 * purely presentational.
 */
export function useLoginForm({ redirectTo, onSuccess }: UseLoginFormOpts) {
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [signingIn, setSigningIn] = useState(false);
  const [resetting, setResetting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false); // hard guard against double-submit
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Restore remembered email and focus the appropriate field
  useEffect(() => {
    const saved = rememberedEmail.get();
    if (saved) {
      setEmail(saved);
      setRemember(true);
      requestAnimationFrame(() => passwordRef.current?.focus());
    } else {
      requestAnimationFrame(() => emailRef.current?.focus());
    }
  }, []);

  const clearFieldError = useCallback((field: keyof LoginFieldErrors) => {
    setErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));
  }, []);

  const applyErrorKey = useCallback(
    (key: AuthErrorKey, field?: AuthErrorField) => {
      const text = t(key);
      setErrors(field ? { [field]: text } : { form: text });
    },
    [t],
  );

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (submittingRef.current) return;

      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        const next: LoginFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as AuthErrorField;
          if (key === "email") next.email = t("auth.errors.emailInvalid");
          else if (key === "password") next.password = t("auth.errors.passwordRequired");
        }
        setErrors(next);
        if (next.email) emailRef.current?.focus();
        else if (next.password) passwordRef.current?.focus();
        return;
      }

      submittingRef.current = true;
      setErrors({});
      setSigningIn(true);
      try {
        const result = await signInWithPassword(parsed.data);
        if (!mountedRef.current) return;

        if (!result.ok) {
          applyErrorKey(result.error.key, result.error.field);
          if (result.error.field === "email") emailRef.current?.focus();
          else passwordRef.current?.select();
          return;
        }

        if (remember) rememberedEmail.set(parsed.data.email);
        else rememberedEmail.clear();

        toast.success(t("auth.signedIn"));
        onSuccess(redirectTo);
      } catch (err) {
        if (!mountedRef.current) return;
        applyErrorKey("auth.errors.network");
        // Surface the underlying reason in dev only
        if (import.meta.env.DEV) console.error("[login] unexpected error", err);
      } finally {
        if (mountedRef.current) {
          setSigningIn(false);
          submittingRef.current = false;
        }
      }
    },
    [applyErrorKey, email, onSuccess, password, redirectTo, remember, t],
  );

  const requestReset = useCallback(async () => {
    if (resetting) return;
    setResetting(true);
    try {
      const result = await sendPasswordReset(email);
      if (!mountedRef.current) return;
      if (!result.ok) {
        if (result.error.field === "email") {
          setErrors((prev) => ({ ...prev, email: t("auth.errors.forgotEmailFirst") }));
          emailRef.current?.focus();
          return;
        }
        toast.error(t(result.error.key));
        return;
      }
      toast.success(t("auth.reset.sent"));
    } finally {
      if (mountedRef.current) setResetting(false);
    }
  }, [email, resetting, t]);

  return {
    // state
    email,
    password,
    remember,
    errors,
    signingIn,
    resetting,
    // refs
    emailRef,
    passwordRef,
    // setters
    setEmail: (v: string) => {
      setEmail(v);
      clearFieldError("email");
    },
    setPassword: (v: string) => {
      setPassword(v);
      clearFieldError("password");
    },
    setRemember,
    // actions
    submit,
    requestReset,
  };
}

export { safeRedirect };
