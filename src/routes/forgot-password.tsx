import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  AlertCircle,
  Send,
  Clock,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

// Client-side cooldown between reset requests to prevent accidental spam
// and to reflect Supabase GoTrue's per-email throttle without hitting 429.
const RESEND_COOLDOWN_SECONDS = 60;
const LAST_SENT_KEY = "nova.auth.forgotSentAt";

const searchSchema = z.object({ email: z.string().optional() }).partial();

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    // If already signed in, sending a recovery email is nonsensical.
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: ForgotPasswordPage,
});

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email is too long");

function humanize(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("over_email_send"))
    return "Too many reset requests. Please wait a minute and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error. Check your connection and try again.";
  return msg || "Could not send reset email. Please try again.";
}

function readLastSentAt(email: string): number {
  try {
    const raw = localStorage.getItem(LAST_SENT_KEY);
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
    /* storage unavailable */
  }
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/forgot-password" });

  const [email, setEmail] = useState(search.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  // Autofocus and restore any pending cooldown for this email
  useEffect(() => {
    requestAnimationFrame(() => emailRef.current?.focus());
  }, []);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Recompute cooldown whenever the email changes so returning to the page
  // with a pending timer still reflects it.
  useEffect(() => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setCooldown(0);
      return;
    }
    const last = readLastSentAt(parsed.data);
    const elapsed = Math.floor((Date.now() - last) / 1000);
    const remaining = RESEND_COOLDOWN_SECONDS - elapsed;
    setCooldown(remaining > 0 ? remaining : 0);
  }, [email]);

  const clearError = useCallback(() => {
    if (error) setError(null);
    if (formError) setFormError(null);
  }, [error, formError]);

  async function sendReset(target: string) {
    const { error: err } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (err) throw err;
    writeLastSentAt(target);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || cooldown > 0) return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      emailRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setError(null);
    setFormError(null);
    setLoading(true);
    try {
      await sendReset(parsed.data);
      setSentTo(parsed.data);
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setFormError(humanize((err as Error)?.message ?? ""));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0 || submittingRef.current) return;
    submittingRef.current = true;
    setFormError(null);
    setLoading(true);
    try {
      await sendReset(sentTo);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setFormError(humanize((err as Error)?.message ?? ""));
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
          {!sent ? (
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={loading}
              className="space-y-6 rounded-2xl border bg-card p-6 sm:p-8 shadow-elegant"
            >
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                Back to sign in
              </Link>

              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Forgot your password?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the email address associated with your account and we'll send you a secure link
                  to reset your password.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail
                    className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    autoCapitalize="none"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="you@company.com"
                    className="ps-9"
                    aria-invalid={!!error}
                    aria-describedby={error ? "email-error" : "email-help"}
                    maxLength={254}
                  />
                </div>
                {error ? (
                  <p id="email-error" role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                ) : (
                  <p id="email-help" className="text-xs text-muted-foreground">
                    We'll send a reset link if this address matches an account.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full h-11 bg-gradient-primary shadow-glow gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Sending reset link…</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>Try again in {cooldown}s</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>Send reset link</span>
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Remembered your password?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <div
              className="space-y-6 rounded-2xl border bg-card p-6 sm:p-8 shadow-elegant"
              role="region"
              aria-label="Reset email sent"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-display font-bold">Check your inbox</h1>
                  <p className="mt-2 text-sm text-muted-foreground break-words">
                    If an account exists for{" "}
                    <span className="font-medium text-foreground break-all">{sentTo}</span>, you'll
                    receive an email with a link to reset your password.
                  </p>
                </div>
              </div>

              <ol className="space-y-2 text-sm text-muted-foreground border-s ps-4 ms-1">
                <li>Open the email from Nova Pro.</li>
                <li>Click the secure reset link — it expires within an hour.</li>
                <li>Choose and confirm a new password.</li>
              </ol>

              {formError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="flex-1 h-11 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Resending…</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      <span>Resend in {cooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      <span>Resend email</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate({ to: "/login" })}
                  className="flex-1 h-11 bg-gradient-primary gap-2"
                >
                  <span>Back to sign in</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Didn't get it? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setFormError(null);
                    requestAnimationFrame(() => emailRef.current?.focus());
                  }}
                  className="text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  use a different email
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
