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
  | "auth.errors.generic";

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
