import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bot, Globe2, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { t, locale } = useI18n();
  return (
    <div className="min-h-screen bg-hero">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">{t("nav.signIn")}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-primary shadow-glow">
                {t("nav.getStarted")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-20 pb-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {locale === "ar" ? "الجيل الجديد من تجارة الزراعة" : "The new operating system for agri-trade"}
          </span>
          <h1 className="mt-6 text-5xl sm:text-7xl font-display font-bold tracking-tight leading-[1.05]">
            <span className="text-gradient-primary">{t("brand.name")}</span>
            <br />
            <span className="text-foreground">{t("brand.tagline")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            {locale === "ar"
              ? "منصة ذكاء اصطناعي واحدة للمصدّرين والمستوردين ومنتجي المحاصيل — أسواق مباشرة، توقعات، وعمليات تصدير."
              : "One AI-native workspace for exporters, importers and producers — live markets, forecasts, weather intelligence and export operations."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/dashboard">
              <Button size="lg" className="bg-gradient-primary shadow-glow gap-2">
                {t("cta.launch")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
            <Link to="/nova-ai">
              <Button size="lg" variant="outline">{t("cta.explore")}</Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: Bot, title: locale === "ar" ? "نوفا AI" : "Nova AI co-pilot", desc: locale === "ar" ? "توصيات فورية للأسعار والأسواق." : "Instant recommendations for prices, buyers and regulations." },
            { icon: LineChart, title: locale === "ar" ? "أسواق مباشرة" : "Live markets", desc: locale === "ar" ? "أسعار السلع الزراعية لحظة بلحظة." : "Second-by-second commodity intelligence across 40+ markets." },
            { icon: Globe2, title: locale === "ar" ? "شبكة عالمية" : "Global network", desc: locale === "ar" ? "شحنات وشركاء في 60 دولة." : "Ship, invoice and settle with partners in 60+ countries." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-elegant">
              <div className="h-11 w-11 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-24 rounded-3xl border border-border bg-card/60 backdrop-blur p-8 md:p-12 shadow-elegant">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { k: "$2.4B", v: locale === "ar" ? "حجم التجارة" : "Trade volume" },
              { k: "60+", v: locale === "ar" ? "دولة" : "Countries" },
              { k: "12k", v: locale === "ar" ? "مصدّر" : "Exporters" },
              { k: "99.99%", v: locale === "ar" ? "توفر" : "Uptime SLA" },
            ].map((s) => (
              <div key={s.v}>
                <div className="text-4xl font-display font-bold text-gradient-primary">{s.k}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>SOC 2 · ISO 27001 · GDPR ready</span>
          </div>
          <div>© {new Date().getFullYear()} Nova Pro. {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</div>
        </div>
      </footer>
    </div>
  );
}
