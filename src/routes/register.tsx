import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, User, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
          <form
            className="w-full max-w-sm space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setTimeout(() => navigate({ to: "/dashboard" }), 600);
            }}
          >
            <div>
              <h1 className="text-3xl font-display font-bold">{t("auth.register.title")}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>
            </div>

            <Field icon={User} id="name" label={t("auth.name")} defaultValue="Karim Hassan" />
            <Field icon={Building2} id="company" label={t("auth.company")} defaultValue="Nile Exports Co." />
            <Field icon={Mail} id="email" type="email" label={t("auth.email")} defaultValue="karim@novapro.com" />
            <Field icon={Lock} id="password" type="password" label={t("auth.password")} defaultValue="••••••••" />

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow gap-2">
              {t("auth.signUp")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
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
  defaultValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id={id} type={type} required defaultValue={defaultValue} className="ps-9" />
      </div>
    </div>
  );
}
