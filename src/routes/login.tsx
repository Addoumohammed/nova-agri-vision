import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { safeRedirect } from "@/lib/auth/service";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailInput } from "@/components/auth/email-input";
import { PasswordInput } from "@/components/auth/password-input";
import { FormAlert } from "@/components/auth/form-alert";
import { useLoginForm } from "@/hooks/use-login-form";

// ------------------------------------------------------------------
// Route
// ------------------------------------------------------------------

const searchSchema = z
  .object({
    redirect: z.string().optional(),
  })
  .partial();

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: safeRedirect(search.redirect) });
  },
  component: LoginPage,
});

// ------------------------------------------------------------------
// Component — presentation only. All business logic lives in
// useLoginForm; all side effects live in lib/auth/service.ts.
// ------------------------------------------------------------------

function LoginPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const redirectTo = safeRedirect(search.redirect);

  const form = useLoginForm({
    redirectTo,
    onSuccess: (to) => navigate({ to, replace: true }),
  });

  const disabled = form.signingIn || form.resetting;

  return (
    <AuthShell>
      <form
        className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
        onSubmit={form.submit}
        noValidate
        aria-busy={form.signingIn}
      >
        <header>
          <h1 className="text-3xl font-display font-bold">{t("auth.login.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
        </header>

        {form.errors.form && <FormAlert variant="error">{form.errors.form}</FormAlert>}

        {redirectTo !== "/dashboard" && !form.errors.form && (
          <FormAlert variant="info">
            <span>
              {t("auth.continueTo")}{" "}
              <code className="font-mono text-foreground break-all">{redirectTo}</code>
            </span>
          </FormAlert>
        )}

        <EmailInput
          label={t("auth.email")}
          ref={form.emailRef}
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
          disabled={disabled}
          required
          error={form.errors.email}
        />

        <PasswordInput
          label={t("auth.password")}
          ref={form.passwordRef}
          value={form.password}
          onChange={(e) => form.setPassword(e.target.value)}
          disabled={disabled}
          required
          error={form.errors.password}
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label
            htmlFor="remember"
            className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none"
          >
            <Checkbox
              id="remember"
              checked={form.remember}
              onCheckedChange={(v) => form.setRemember(v === true)}
              disabled={disabled}
            />
            {t("auth.remember")}
          </label>
          <button
            type="button"
            onClick={form.requestReset}
            disabled={disabled}
            className="text-sm text-primary hover:underline disabled:opacity-60 disabled:no-underline inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {form.resetting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
            {t("auth.forgot")}
          </button>
        </div>

        <Button
          type="submit"
          disabled={disabled}
          className="w-full bg-gradient-primary shadow-glow gap-2 h-11"
        >
          {form.signingIn ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{t("auth.signingIn")}</span>
            </>
          ) : (
            <>
              <span>{t("auth.signIn")}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            {t("auth.signUp")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
