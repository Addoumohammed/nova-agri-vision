import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { z } from "zod";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

// Password policy — mirrors modern OWASP guidance.
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

const passwordSchema = z
  .string()
  .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters`)
  .max(MAX_LENGTH, `Password must be at most ${MAX_LENGTH} characters`)
  .refine((v) => /[a-z]/.test(v), "Add a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Add an uppercase letter")
  .refine((v) => /\d/.test(v), "Add a number");

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string };

function scorePassword(pw: string): Strength {
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const map: Record<number, Strength> = {
    0: { score: 0, label: "Too weak", color: "bg-destructive" },
    1: { score: 1, label: "Weak", color: "bg-destructive" },
    2: { score: 2, label: "Fair", color: "bg-amber-500" },
    3: { score: 3, label: "Strong", color: "bg-primary" },
    4: { score: 4, label: "Excellent", color: "bg-emerald-500" },
  };
  return map[clamped];
}

function humanize(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("same") && m.includes("password"))
    return "New password must be different from the current one.";
  if (m.includes("session") || m.includes("expired") || m.includes("invalid") || m.includes("token"))
    return "Your reset link has expired or is invalid. Please request a new one.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("compromised"))
    return "This password has appeared in known data breaches. Please choose a different password.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error. Check your connection and try again.";
  return msg || "Could not update password. Please try again.";
}

type Status = "verifying" | "ready" | "invalid" | "success";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  // Verify the recovery token by waiting for Supabase to hydrate a session
  // from the URL (either the hash flow, or /auth/callback → PKCE code exchange
  // → this page). If nothing arrives within a short window, mark as invalid.
  useEffect(() => {
    let settled = false;
    const markReady = () => {
      if (settled) return;
      settled = true;
      setStatus("ready");
      requestAnimationFrame(() => passwordRef.current?.focus());
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    // Fallback: if no session/PASSWORD_RECOVERY event within 4s, the link is bad.
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setStatus("invalid");
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const strength = useMemo(() => scorePassword(password), [password]);
  const confirmMatches = confirm.length > 0 && confirm === password;
  const confirmMismatch = confirm.length > 0 && confirm !== password;

  const clearFieldError = useCallback((field: "password" | "confirm") => {
    setError((prev) =>
      prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev,
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || status !== "ready") return;

    const fieldErrors: typeof error = {};
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) fieldErrors.password = parsed.error.issues[0]?.message;
    if (password !== confirm) fieldErrors.confirm = "Passwords do not match";

    if (fieldErrors.password || fieldErrors.confirm) {
      setError(fieldErrors);
      if (fieldErrors.password) passwordRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setError({});
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        const text = humanize(err.message);
        // Token-related failures kick the user back to the invalid state.
        if (/expired|invalid|token|session/i.test(err.message)) {
          setStatus("invalid");
        } else if (/same|different/i.test(err.message)) {
          setError({ password: text });
          passwordRef.current?.select();
        } else {
          setError({ form: text });
        }
        return;
      }

      // Security: invalidate ALL other sessions after a password reset so a
      // stolen refresh token can't outlive the reset. Best-effort — never
      // block navigation on this call.
      try {
        await supabase.auth.signOut({ scope: "others" });
      } catch {
        /* not fatal */
      }

      setStatus("success");
      // Give the user a moment to see the success state before redirecting.
      window.setTimeout(() => {
        navigate({ to: "/dashboard", replace: true });
      }, 1600);
    } catch (err) {
      setError({ form: humanize((err as Error)?.message ?? "") });
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 sm:p-6">
        <BrandMark />
        <div className="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {status === "verifying" && <VerifyingCard />}
          {status === "invalid" && <InvalidCard />}
          {status === "success" && <SuccessCard />}
          {status === "ready" && (
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={loading}
              className="space-y-6 rounded-2xl border bg-card p-6 sm:p-8 shadow-elegant"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold">Set a new password</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a strong password. You'll be signed in automatically.
                  </p>
                </div>
              </div>

              {error.form && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error.form}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Lock
                    className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError("password");
                    }}
                    placeholder="At least 8 characters"
                    className="ps-9 pe-10"
                    aria-invalid={!!error.password}
                    aria-describedby="password-strength password-help password-error"
                    maxLength={MAX_LENGTH}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    className="absolute end-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Strength meter */}
                <div
                  id="password-strength"
                  className="flex items-center gap-2 pt-1"
                  aria-live="polite"
                >
                  <div className="flex gap-1 flex-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          password.length === 0
                            ? "bg-muted"
                            : i <= strength.score
                              ? strength.color
                              : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[64px] text-end tabular-nums">
                    {password.length === 0 ? "" : strength.label}
                  </span>
                </div>

                {error.password ? (
                  <p id="password-error" role="alert" className="text-xs text-destructive">
                    {error.password}
                  </p>
                ) : (
                  <p id="password-help" className="text-xs text-muted-foreground">
                    Use {MIN_LENGTH}+ characters with a mix of upper- and lowercase letters and a
                    number.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <div className="relative">
                  <Lock
                    className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      clearFieldError("confirm");
                    }}
                    placeholder="Re-enter your new password"
                    className="ps-9 pe-10"
                    aria-invalid={!!error.confirm || confirmMismatch}
                    aria-describedby="confirm-status confirm-error"
                    maxLength={MAX_LENGTH}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    aria-pressed={showConfirm}
                    aria-controls="confirm"
                    className="absolute end-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p id="confirm-status" aria-live="polite" className="text-xs min-h-[1rem]">
                  {error.confirm ? (
                    <span id="confirm-error" role="alert" className="text-destructive">
                      {error.confirm}
                    </span>
                  ) : confirmMismatch ? (
                    <span className="text-destructive inline-flex items-center gap-1">
                      <XCircle className="h-3 w-3" aria-hidden="true" />
                      Passwords don't match yet
                    </span>
                  ) : confirmMatches ? (
                    <span className="text-emerald-500 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      Passwords match
                    </span>
                  ) : null}
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-primary shadow-glow gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Updating password…</span>
                  </>
                ) : (
                  <>
                    <span>Update password</span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                For your security, all other active sessions will be signed out.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifyingCard() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-3 rounded-2xl border bg-card p-8 shadow-elegant text-center"
    >
      <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-display font-semibold">Validating your reset link…</h1>
      <p className="text-sm text-muted-foreground">This should only take a moment.</p>
    </div>
  );
}

function InvalidCard() {
  return (
    <div
      role="alert"
      className="space-y-5 rounded-2xl border bg-card p-6 sm:p-8 shadow-elegant"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-destructive/10 grid place-items-center shrink-0">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">Reset link expired or invalid</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This password reset link is no longer valid. Reset links expire after a short time and
            can only be used once. Please request a new one.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button asChild className="flex-1 h-11 bg-gradient-primary gap-2">
          <Link to="/forgot-password">
            <span>Request new link</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 h-11">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}

function SuccessCard() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4 rounded-2xl border bg-card p-8 shadow-elegant text-center"
    >
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 grid place-items-center">
        <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-xl font-display font-bold">Password updated</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signing you in and taking you to your dashboard…
        </p>
      </div>
      <div className="flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  );
}
