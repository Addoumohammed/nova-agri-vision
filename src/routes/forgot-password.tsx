import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailInput } from "@/components/auth/email-input";
import { FormAlert } from "@/components/auth/form-alert";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useForgotPasswordForm } from "@/hooks/use-forgot-password-form";

// ------------------------------------------------------------------
// Route — signed-in visitors have no reason to be here.
// ------------------------------------------------------------------

const searchSchema = z.object({ email: z.string().optional() }).partial();

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: ForgotPasswordPage,
});

// ------------------------------------------------------------------
// Component — presentation only. All logic lives in the hook and in
// lib/auth/service.ts.
// ------------------------------------------------------------------

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function ForgotPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useSearch({ from: "/forgot-password" });

  const form = useForgotPasswordForm({ initialEmail: search.email });

  return (
    <AuthShell>
      <div className="w-full">
        {!form.sent ? <RequestForm form={form} t={t} /> : (
          <SentPanel
            form={form}
            t={t}
            onBackToLogin={() => navigate({ to: "/login", replace: true })}
          />
        )}
      </div>
    </AuthShell>
  );

  // --- Local subcomponents keep JSX flat while sharing hook state ------

  function RequestForm({
    form,
    t,
  }: {
    form: ReturnType<typeof useForgotPasswordForm>;
    t: ReturnType<typeof useI18n>["t"];
  }) {
    const buttonDisabled = form.loading || form.cooldown > 0;
    return (
      <form
        onSubmit={form.submit}
        noValidate
        aria-busy={form.loading}
        className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t("auth.forgot.back")}
        </Link>

        <header>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            {t("auth.forgot.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.forgot.subtitle")}</p>
        </header>

        {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}

        <EmailInput
          ref={form.emailRef}
          label={t("auth.email")}
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
          disabled={form.loading}
          required
          error={form.fieldError ?? undefined}
        />
        {!form.fieldError && (
          <p className="text-xs text-muted-foreground -mt-3">{t("auth.forgot.emailHelp")}</p>
        )}

        <Button
          type="submit"
          disabled={buttonDisabled}
          className="w-full h-11 bg-gradient-primary shadow-glow gap-2"
        >
          {form.loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{t("auth.forgot.sending")}</span>
            </>
          ) : form.cooldown > 0 ? (
            <>
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{fmt(t("auth.forgot.cooldown"), { seconds: form.cooldown })}</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{t("auth.forgot.send")}</span>
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.forgot.remembered")}{" "}
          <Link
            to="/login"
            className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </form>
    );
  }

  function SentPanel({
    form,
    t,
    onBackToLogin,
  }: {
    form: ReturnType<typeof useForgotPasswordForm>;
    t: ReturnType<typeof useI18n>["t"];
    onBackToLogin: () => void;
  }) {
    const resendDisabled = form.loading || form.cooldown > 0;
    return (
      <section
        role="region"
        aria-label={t("auth.forgot.regionLabel")}
        className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
      >
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center shrink-0"
            aria-hidden="true"
          >
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-display font-bold">
              {t("auth.forgot.sentTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground break-words">
              {(() => {
                const body = t("auth.forgot.sentBody");
                const [before, after] = body.split("{email}");
                return (
                  <>
                    {before}
                    <span className="font-medium text-foreground break-all">
                      {form.sentTo}
                    </span>
                    {after}
                  </>
                );
              })()}
            </p>
          </div>
        </div>

        <ol className="space-y-2 text-sm text-muted-foreground border-s ps-4 ms-1 list-decimal list-inside marker:text-muted-foreground">
          <li>{t("auth.forgot.step1")}</li>
          <li>{t("auth.forgot.step2")}</li>
          <li>{t("auth.forgot.step3")}</li>
        </ol>

        {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={form.resend}
            disabled={resendDisabled}
            className="flex-1 min-h-11 gap-2"
          >
            {form.loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{t("auth.forgot.resending")}</span>
              </>
            ) : form.cooldown > 0 ? (
              <>
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{fmt(t("auth.forgot.resendCooldown"), { seconds: form.cooldown })}</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{t("auth.forgot.resend")}</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={onBackToLogin}
            className="flex-1 min-h-11 bg-gradient-primary gap-2"
          >
            <span>{t("auth.forgot.back")}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t("auth.forgot.spam")}{" "}
          <button
            type="button"
            onClick={form.reset}
            className="text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {t("auth.forgot.useDifferent")}
          </button>
          .
        </p>
      </section>
    );
  }
}
