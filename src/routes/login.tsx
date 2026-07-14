import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-hero relative overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-gold opacity-20 blur-3xl" />
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

        <div className="flex-1 flex items-center justify-center">
          <form
            className="w-full max-w-sm space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setTimeout(() => navigate({ to: "/dashboard" }), 600);
            }}
          >
            <div>
              <h1 className="text-3xl font-display font-bold">{t("auth.login.title")}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" required defaultValue="karim@novapro.com" className="ps-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" required defaultValue="••••••••" className="ps-9" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox defaultChecked /> {t("auth.remember")}
              </label>
              <a href="#" className="text-sm text-primary hover:underline">
                {t("auth.forgot")}
              </a>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow gap-2">
              {t("auth.signIn")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground uppercase tracking-wider">
                  {t("auth.orContinue")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" type="button">Google</Button>
              <Button variant="outline" type="button">Apple</Button>
            </div>

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
