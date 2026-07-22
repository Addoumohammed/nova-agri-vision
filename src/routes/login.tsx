import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

// Only allow same-origin relative paths as redirect targets to prevent open-redirect attacks.
function safeRedirect(path: unknown, fallback = "/dashboard"): string {
  if (typeof path !== "string" || !path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/auth")) return fallback;
  return path;
}

const searchSchema = z.object({
  redirect: z.string().optional(),
}).partial();

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: safeRedirect(search.redirect) as "/dashboard" });
  },
  component: LoginPage,
});

const REMEMBER_KEY = "nova.auth.rememberedEmail";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

type FieldErrors = { email?: string; password?: string; form?: string };

/** Map Supabase auth errors to user-friendly strings, without leaking which factor failed. */
function humanizeAuthError(message: string): { field?: "email" | "password"; text: string } {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return { text: "The email or password you entered is incorrect." };
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return { field: "email", text: "Please confirm your email address. Check your inbox for the verification link." };
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return { text: "Too many attempts. Please wait a minute and try again." };
  }
  if (m.includes("network") || m.includes("fetch")) {
    return { text: "Network error. Check your connection and try again." };
  }
  return { text: message || "Sign-in failed. Please try again." };
}

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const redirectTo = safeRedirect(search.redirect);

  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false); // hard guard against double-submit

  // Restore remembered email
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
        // focus password when email is prefilled
        requestAnimationFrame(() => passwordRef.current?.focus());
      } else {
        requestAnimationFrame(() => emailRef.current?.focus());
      }
    } catch {
      /* localStorage may be unavailable */
    }
  }, []);

  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined, form: undefined } : prev));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      // Focus first invalid field
      if (fieldErrors.email) emailRef.current?.focus();
      else if (fieldErrors.password) passwordRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setErrors({});
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        const mapped = humanizeAuthError(error.message);
        setErrors(mapped.field ? { [mapped.field]: mapped.text } : { form: mapped.text });
        if (mapped.field === "email") emailRef.current?.focus();
        else passwordRef.current?.select();
        return;
      }

      if (!data.session) {
        setErrors({ form: "Sign-in did not return a session. Please try again." });
        return;
      }

      // Persist / clear remembered email
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, parsed.data.email);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }

      toast.success("Signed in");
      navigate({ to: redirectTo as "/dashboard", replace: true });
    } catch (err) {
      const mapped = humanizeAuthError((err as Error)?.message ?? "");
      setErrors({ form: mapped.text });
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function handleForgot() {
    if (resetting) return;
    const target = email.trim().toLowerCase();
    const check = z.string().email().max(254).safeParse(target);
    if (!check.success) {
      setErrors((prev) => ({ ...prev, email: "Enter your account email above, then click Forgot password" }));
      emailRef.current?.focus();
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        toast.error(humanizeAuthError(error.message).text);
      } else {
        toast.success("Password reset email sent. Check your inbox.");
      }
    } catch (err) {
      toast.error((err as Error)?.message ?? "Could not send reset email");
    } finally {
      setResetting(false);
    }
  }

  const disabled = loading || resetting;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-hero relative overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-primary opacity-30 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-gold opacity-20 blur-3xl" aria-hidden="true" />
        <BrandMark size="lg" />
        <div className="relative">
          <h2 className="text-4xl font-display font-bold leading-tight">
            {t("brand.tagline")}
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            {t("novaai.subtitle")}
          </p>
        </div>
        <div className="text-xs text-muted-foreground relative">
          © {new Date().getFullYear()} Nova Pro
        </div>
      </div>

      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end gap-2">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center py-8">
          <form
            className="w-full max-w-sm space-y-5"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={loading}
          >
            <div>
              <h1 className="text-3xl font-display font-bold">{t("auth.login.title")}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
            </div>

            {/* Form-level status (invalid credentials, network errors) */}
            {errors.form && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{errors.form}</span>
              </div>
            )}

            {redirectTo !== "/dashboard" && !errors.form && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span>Sign in to continue to <code className="font-mono text-foreground">{redirectTo}</code></span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <Input
                  id="email"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  required
                  disabled={disabled}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="you@company.com"
                  className="ps-9"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  maxLength={254}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <Input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={disabled}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  placeholder="••••••••"
                  className="ps-9 pe-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  aria-controls="password"
                  tabIndex={0}
                  className="absolute end-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label htmlFor="remember" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  disabled={disabled}
                />
                {t("auth.remember")}
              </label>
              <button
                type="button"
                onClick={handleForgot}
                disabled={disabled}
                className="text-sm text-primary hover:underline disabled:opacity-60 disabled:no-underline inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {resetting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                {t("auth.forgot")}
              </button>
            </div>

            <Button
              type="submit"
              disabled={disabled}
              className="w-full bg-gradient-primary shadow-glow gap-2 h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>{t("auth.signIn")}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                {t("auth.signUp")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
