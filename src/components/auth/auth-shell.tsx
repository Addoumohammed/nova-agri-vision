import type { ReactNode } from "react";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

/**
 * Shared split-panel shell for every auth surface (login, register, forgot,
 * reset). Keeps a single source of truth for branding, locale/theme toggles,
 * safe-area padding and responsive layout.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      {/* Brand panel — desktop only */}
      <aside
        aria-label="Nova Pro"
        className="hidden lg:flex flex-col justify-between p-10 bg-hero relative overflow-hidden"
      >
        <div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-primary opacity-30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-gold opacity-20 blur-3xl"
          aria-hidden="true"
        />
        <BrandMark size="lg" />
        <div className="relative">
          <h2 className="text-4xl font-display font-bold leading-tight">{t("brand.tagline")}</h2>
          <p className="mt-4 text-muted-foreground max-w-md">{t("auth.brand.desc")}</p>
        </div>
        <div className="text-xs text-muted-foreground relative">
          © {new Date().getFullYear()} {t("brand.name")}
        </div>
      </aside>

      {/* Form panel */}
      <section
        className="flex flex-col p-6 sm:p-10"
        style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        <header className="flex items-center justify-between lg:justify-end gap-2">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </section>
    </div>
  );
}
