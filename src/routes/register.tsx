import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailInput } from "@/components/auth/email-input";
import { PasswordInput } from "@/components/auth/password-input";
import { TextField } from "@/components/auth/text-field";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordStrength } from "@/components/auth/password-strength";
import { useRegisterForm } from "@/hooks/use-register-form";

// ------------------------------------------------------------------
// Route — signed-in visitors bounce straight to the dashboard.
// ------------------------------------------------------------------

export const Route = createFileRoute("/register")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: RegisterPage,
});

// ------------------------------------------------------------------
// Component — presentation only. All logic lives in useRegisterForm
// and lib/auth/service.ts.
// ------------------------------------------------------------------

function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const form = useRegisterForm({
    onSuccess: ({ needsEmailConfirmation }) => {
      navigate({ to: needsEmailConfirmation ? "/login" : "/dashboard", replace: true });
    },
  });

  const disabled = form.submitting;
  const passwordId = "register-password";

  return (
    <AuthShell>
      <form
        className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
        onSubmit={form.submit}
        noValidate
        aria-busy={form.submitting}
      >
        <header>
          <h1 className="text-3xl font-display font-bold">{t("auth.register.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>
        </header>

        {form.errors.form && <FormAlert variant="error">{form.errors.form}</FormAlert>}

        <TextField
          ref={form.refs.name}
          icon={User}
          label={t("auth.name")}
          autoComplete="name"
          placeholder={t("auth.namePlaceholder")}
          value={form.fields.name}
          onChange={(e) => form.setField("name")(e.target.value)}
          disabled={disabled}
          required
          maxLength={80}
          error={form.errors.name}
        />

        <TextField
          ref={form.refs.company}
          icon={Building2}
          label={t("auth.company")}
          autoComplete="organization"
          placeholder={t("auth.companyPlaceholder")}
          value={form.fields.company}
          onChange={(e) => form.setField("company")(e.target.value)}
          disabled={disabled}
          required
          maxLength={120}
          error={form.errors.company}
        />

        <EmailInput
          ref={form.refs.email}
          label={t("auth.email")}
          value={form.fields.email}
          onChange={(e) => form.setField("email")(e.target.value)}
          disabled={disabled}
          required
          error={form.errors.email}
        />

        <div className="space-y-2">
          <PasswordInput
            id={passwordId}
            ref={form.refs.password}
            label={t("auth.password")}
            autoComplete="new-password"
            value={form.fields.password}
            onChange={(e) => form.setField("password")(e.target.value)}
            disabled={disabled}
            required
            error={form.errors.password}
          />
          <PasswordStrength value={form.fields.password} />
          {!form.errors.password && (
            <p className="text-xs text-muted-foreground">{t("auth.password.hint")}</p>
          )}
        </div>

        <PasswordInput
          ref={form.refs.confirmPassword}
          label={t("auth.confirmPassword")}
          autoComplete="new-password"
          value={form.fields.confirmPassword}
          onChange={(e) => form.setField("confirmPassword")(e.target.value)}
          disabled={disabled}
          required
          error={form.errors.confirmPassword}
        />

        <Button
          type="submit"
          disabled={disabled}
          className="w-full bg-gradient-primary shadow-glow gap-2 h-11 mt-2"
        >
          {form.submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{t("auth.creatingAccount")}</span>
            </>
          ) : (
            <>
              <span>{t("auth.signUp")}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link
            to="/login"
            className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
