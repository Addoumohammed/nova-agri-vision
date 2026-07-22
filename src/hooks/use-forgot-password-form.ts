import { useCallback, useEffect, useRef, useState } from "react";
import {
  emailSchema,
  humanizeAuthError,
  sendPasswordReset,
  type AuthErrorKey,
} from "@/lib/auth/service";
import { useI18n } from "@/lib/i18n";

/**
 * Owns the forgot-password lifecycle:
 *  - single source of truth for cooldown (survives navigation via localStorage)
 *  - schema validation on submit
 *  - focus management, double-submit guard, unmount safety
 *  - success + resend flows share one code path
 */

export const RESEND_COOLDOWN_SECONDS = 60;
const LAST_SENT_KEY = "nova.auth.forgotSentAt";

function readLastSentAt(email: string): number {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LAST_SENT_KEY) : null;
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { email?: string; at?: number };
    if (parsed.email !== email.toLowerCase()) return 0;
    return typeof parsed.at === "number" ? parsed.at : 0;
  } catch {
    return 0;
  }
}

function writeLastSentAt(email: string) {
  try {
    localStorage.setItem(
      LAST_SENT_KEY,
      JSON.stringify({ email: email.toLowerCase(), at: Date.now() }),
    );
  } catch {
    /* storage unavailable — cooldown becomes memory-only, non-fatal */
  }
}

function remainingCooldown(email: string): number {
  const last = readLastSentAt(email);
  if (!last) return 0;
  const elapsed = Math.floor((Date.now() - last) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
}

export interface UseForgotPasswordFormOpts {
  initialEmail?: string;
}

export function useForgotPasswordForm({ initialEmail }: UseForgotPasswordFormOpts = {}) {
  const { t } = useI18n();

  const [email, setEmailState] = useState((initialEmail ?? "").trim());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Autofocus once on mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => emailRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  // 1s cooldown ticker — stops itself at zero and restarts when reseeded.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Recompute cooldown when the typed email changes — brings back any
  // pending timer for the same address (e.g. after page navigation).
  useEffect(() => {
    const parsed = emailSchema.safeParse(email);
    setCooldown(parsed.success ? remainingCooldown(parsed.data) : 0);
  }, [email]);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    setFieldError((prev) => (prev ? null : prev));
    setFormError((prev) => (prev ? null : prev));
  }, []);

  const applyError = useCallback(
    (key: AuthErrorKey, field?: "email") => {
      const text = t(key);
      if (field === "email") {
        setFieldError(text);
        emailRef.current?.focus();
      } else {
        setFormError(text);
      }
    },
    [t],
  );

  const dispatch = useCallback(
    async (target: string) => {
      submittingRef.current = true;
      setLoading(true);
      setFormError(null);
      try {
        const result = await sendPasswordReset(target);
        if (!mountedRef.current) return { ok: false as const };
        if (!result.ok) {
          applyError(result.error.key, result.error.field as "email" | undefined);
          return { ok: false as const };
        }
        writeLastSentAt(target);
        setCooldown(RESEND_COOLDOWN_SECONDS);
        return { ok: true as const };
      } catch (err) {
        if (mountedRef.current) {
          applyError(humanizeAuthError((err as Error)?.message).key);
        }
        return { ok: false as const };
      } finally {
        if (mountedRef.current) setLoading(false);
        submittingRef.current = false;
      }
    },
    [applyError],
  );

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (submittingRef.current || cooldown > 0) return;

      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        applyError("auth.errors.emailInvalid", "email");
        return;
      }

      const result = await dispatch(parsed.data);
      if (result.ok && mountedRef.current) {
        setSentTo(parsed.data);
        setSent(true);
      }
    },
    [applyError, cooldown, dispatch, email],
  );

  const resend = useCallback(async () => {
    if (!sentTo || cooldown > 0 || submittingRef.current) return;
    await dispatch(sentTo);
  }, [cooldown, dispatch, sentTo]);

  const reset = useCallback(() => {
    setSent(false);
    setFormError(null);
    requestAnimationFrame(() => emailRef.current?.focus());
  }, []);

  return {
    email,
    setEmail,
    fieldError,
    formError,
    loading,
    sent,
    sentTo,
    cooldown,
    emailRef,
    submit,
    resend,
    reset,
  };
}
