import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Globe2,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Landing,
});

/** Small non-blocking hook: does the visitor already have a session? Runs
 *  after hydration so it never affects SSR or the LCP. */
function useIsAuthenticated() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (!cancelled) setAuthed(!!data.session);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setAuthed(!!session);
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);
  return authed;
}

type Feature = { icon: typeof Bot; title: string; desc: string };
type Stat = { value: string; label: string };

function Landing() {
  const { t, locale } = useI18n();
  const authed = useIsAuthenticated();

  const features: Feature[] = [
    { icon: Bot, title: t("landing.feature.ai.title"), desc: t("landing.feature.ai.desc") },
    { icon: LineChart, title: t("landing.feature.markets.title"), desc: t("landing.feature.markets.desc") },
    { icon: Globe2, title: t("landing.feature.network.title"), desc: t("landing.feature.network.desc") },
  ];

  const stats: Stat[] = [
    { value: "$2.4B", label: t("landing.stat.tradeVolume") },
    { value: "60+", label: t("landing.stat.countries") },
    { value: "12k", label: t("landing.stat.exporters") },
    { value: "99.99%", label: t("landing.stat.uptime") },
  ];

  return (
    <div className="min-h-dvh bg-hero flex flex-col">
      {/* Skip link for keyboard users */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:start-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-glow"
      >
        {t("landing.skipToContent")}
      </a>

      <header
        className="sticky top-0 z-40 glass border-b border-border/60"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <BrandMark />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            <LocaleToggle />
            <ThemeToggle />
            {authed === true ? (
              <Button asChild size="sm" className="bg-gradient-primary shadow-glow">
                <Link to="/dashboard">{t("cta.openDashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/login">{t("nav.signIn")}</Link>
                </Button>
                <Button asChild size="sm" className="bg-gradient-primary shadow-glow">
                  <Link to="/register">{t("nav.getStarted")}</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 pt-16 sm:pt-20 pb-16 sm:pb-24">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t("landing.eyebrow")}
          </span>
          <h1
            id="hero-heading"
            className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]"
          >
            <span className="block text-gradient-primary">{t("brand.name")}</span>
            <span className="block text-foreground">{t("brand.tagline")}</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl">
            {t("landing.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            {authed === true ? (
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow gap-2">
                <Link to="/dashboard">
                  {t("cta.openDashboard")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow gap-2">
                <Link to="/register">
                  {t("cta.launch")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link to={authed === true ? "/nova-ai" : "/login"}>{t("cta.explore")}</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="mt-20 sm:mt-24">
          <h2 id="features-heading" className="sr-only">
            {locale === "ar" ? "المميزات" : "Features"}
          </h2>
          <ul className="grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 list-none p-0">
            {features.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-elegant transition hover:border-primary/40 hover:shadow-glow"
              >
                <div className="h-11 w-11 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                  <f.icon className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display font-semibold text-lg">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Stats */}
        <section aria-labelledby="stats-heading" className="mt-20 sm:mt-24">
          <h2 id="stats-heading" className="sr-only">
            {locale === "ar" ? "أرقام موثوقة" : "Trusted numbers"}
          </h2>
          <div className="rounded-3xl border border-border bg-card/60 backdrop-blur p-6 sm:p-8 md:p-12 shadow-elegant">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-3xl sm:text-4xl font-display font-bold text-gradient-primary tabular-nums">
                    {s.value}
                  </dd>
                  <div aria-hidden="true" className="mt-1 text-sm text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Secondary reassurance strip */}
        <section className="mt-16 sm:mt-20 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            {locale === "ar" ? "بيانات في الوقت الحقيقي" : "Real-time data"}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
            {locale === "ar" ? "متعدد اللغات والعملات" : "Multi-language, multi-currency"}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("landing.trust")}
          </span>
        </section>
      </main>

      <footer
        className="border-t border-border/60 py-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{t("landing.trust")}</span>
          </div>
          <div>
            © {new Date().getFullYear()} {t("brand.name")}. {t("landing.rights")}
          </div>
        </div>
      </footer>
    </div>
  );
}
