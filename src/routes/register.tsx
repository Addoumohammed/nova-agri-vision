import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, User, Building2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: RegisterPage,
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  company: z.string().trim().min(2, "Please enter your company").max(120),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const bind = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof form;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: { full_name: parsed.data.name, company: parsed.data.company },
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        toast.success("Account created");
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Check your email to confirm your account");
        navigate({ to: "/login" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-hero relative overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-gold opacity-25 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
        <BrandMark size="lg" />
        <div className="relative space-y-6">
          <h2 className="text-4xl font-display font-bold leading-tight">
            {t("auth.register.title")}
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>✦ {t("dash.kpi.revenue")} — realtime</li>
            <li>✦ {t("novaai.title")} co-pilot</li>
            <li>✦ {t("weather.title")} intelligence</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground relative">© {new Date().getFullYear()} Nova Pro</div>
      </div>

      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end gap-2">
          <div className="lg:hidden"><BrandMark /></div>
          <div className="flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit} noValidate aria-busy={loading}>
            <div>
              <h1 className="text-3xl font-display font-bold">{t("auth.register.title")}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>
            </div>

            <Field icon={User} id="name" autoComplete="name" label={t("auth.name")} value={form.name} onChange={bind("name")} error={errors.name} />
            <Field icon={Building2} id="company" autoComplete="organization" label={t("auth.company")} value={form.company} onChange={bind("company")} error={errors.company} />
            <Field icon={Mail} id="email" type="email" autoComplete="email" inputMode="email" label={t("auth.email")} value={form.email} onChange={bind("email")} error={errors.email} />
            <Field icon={Lock} id="password" type="password" autoComplete="new-password" label={t("auth.password")} value={form.password} onChange={bind("password")} error={errors.password} hint="At least 8 characters" />

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Creating account…</span>
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
              <Link to="/login" className="text-primary font-medium hover:underline">
                {t("auth.signIn")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  inputMode,
  error,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "tel" | "url" | "search";
  error?: string;
  hint?: string;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type={type}
          required
          value={value}
          onChange={onChange}
          className="ps-9"
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
