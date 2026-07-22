/**
 * Auth service layer.
 *
 * Isolates every side-effect (Supabase calls, localStorage, URL parsing) behind
 * pure, testable functions so route components stay purely presentational.
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// --------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Password policy — OWASP-aligned. Mirrors the /reset-password page so we
// have a single source of truth for what "strong enough" means at any
// point a password is created or changed.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72; // Supabase / bcrypt cap

export const passwordPolicySchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { message: "auth.errors.passwordTooShort" })
  .max(MAX_PASSWORD_LENGTH, { message: "auth.errors.passwordTooLong" })
  .regex(/[a-z]/, { message: "auth.errors.passwordWeak" })
  .regex(/[A-Z]/, { message: "auth.errors.passwordWeak" })
  .regex(/\d/, { message: "auth.errors.passwordWeak" });

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, { message: "auth.errors.nameRequired" }).max(80),
    company: z.string().trim().min(2, { message: "auth.errors.companyRequired" }).max(120),
    email: emailSchema,
    password: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "auth.errors.passwordMismatch",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// --------------------------------------------------------------------
// Password strength scoring — pure, deterministic. Consumed by any
// password-change surface (register, reset, change-password).
// --------------------------------------------------------------------

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordStrengthLevel;
  labelKey:
    | "auth.password.strength.tooWeak"
    | "auth.password.strength.weak"
    | "auth.password.strength.fair"
    | "auth.password.strength.strong"
    | "auth.password.strength.excellent";
  /** Tailwind background token — semantic, dark-mode friendly. */
  colorClass: string;
}

export function scorePassword(pw: string): PasswordStrength {
  if (!pw) {
    return { score: 0, labelKey: "auth.password.strength.tooWeak", colorClass: "bg-destructive" };
  }
  let raw = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) raw++;
  if (pw.length >= 12) raw++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) raw++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) raw++;
  const score = Math.min(4, raw) as PasswordStrengthLevel;
  const table: Record<PasswordStrengthLevel, PasswordStrength> = {
    0: { score: 0, labelKey: "auth.password.strength.tooWeak", colorClass: "bg-destructive" },
    1: { score: 1, labelKey: "auth.password.strength.weak", colorClass: "bg-destructive" },
    2: { score: 2, labelKey: "auth.password.strength.fair", colorClass: "bg-amber-500" },
    3: { score: 3, labelKey: "auth.password.strength.strong", colorClass: "bg-primary" },
    4: { score: 4, labelKey: "auth.password.strength.excellent", colorClass: "bg-emerald-500" },
  };
  return table[score];
}



// --------------------------------------------------------------------
// Safe redirect
// --------------------------------------------------------------------

/**
 * Only allow same-origin relative paths as redirect targets. Prevents open
 * redirects and infinite bounces through the auth surface.
 */
export function safeRedirect(path: unknown, fallback = "/dashboard"): string {
  if (typeof path !== "string" || !path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/auth") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password")
  ) {
    return fallback;
  }
  return path;
}

// --------------------------------------------------------------------
// Error humanization — maps Supabase errors to i18n keys.
// --------------------------------------------------------------------

export type AuthErrorKey =
  | "auth.errors.invalidCredentials"
  | "auth.errors.emailNotConfirmed"
  | "auth.errors.rateLimit"
  | "auth.errors.network"
  | "auth.errors.noSession"
  | "auth.errors.generic"
  | "auth.errors.emailInUse"
  | "auth.errors.passwordWeak"
  | "auth.errors.passwordTooShort"
  | "auth.errors.passwordTooLong"
  | "auth.errors.signupFailed";

export type AuthErrorField = "email" | "password";

export interface HumanizedAuthError {
  key: AuthErrorKey;
  field?: AuthErrorField;
}

export function humanizeAuthError(message: string | undefined | null): HumanizedAuthError {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return { key: "auth.errors.invalidCredentials" };
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return { key: "auth.errors.emailNotConfirmed", field: "email" };
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return { key: "auth.errors.rateLimit" };
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch")) {
    return { key: "auth.errors.network" };
  }
  return { key: "auth.errors.generic" };
}

// --------------------------------------------------------------------
// Remembered email — best-effort, tolerates disabled storage / SSR.
// --------------------------------------------------------------------

const REMEMBER_KEY = "nova.auth.rememberedEmail";

export const rememberedEmail = {
  get(): string | null {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(REMEMBER_KEY) : null;
    } catch {
      return null;
    }
  },
  set(email: string): void {
    try {
      localStorage.setItem(REMEMBER_KEY, email);
    } catch {
      /* ignore */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  },
};

// --------------------------------------------------------------------
// Auth operations
// --------------------------------------------------------------------

export type SignInResult =
  | { ok: true }
  | { ok: false; error: HumanizedAuthError };

export async function signInWithPassword(input: LoginInput): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error) return { ok: false, error: humanizeAuthError(error.message) };
  if (!data.session) return { ok: false, error: { key: "auth.errors.noSession" } };
  return { ok: true };
}

export type ResetResult =
  | { ok: true }
  | { ok: false; error: HumanizedAuthError };

export async function sendPasswordReset(email: string): Promise<ResetResult> {
  const target = email.trim().toLowerCase();
  const check = emailSchema.safeParse(target);
  if (!check.success) return { ok: false, error: { key: "auth.errors.generic", field: "email" } };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(check.data, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) return { ok: false, error: humanizeAuthError(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: humanizeAuthError((err as Error)?.message) };
  }
}
