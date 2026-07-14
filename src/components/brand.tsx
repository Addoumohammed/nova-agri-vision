import { Link } from "@tanstack/react-router";
import { Moon, Sun, Languages, Sparkles } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  const { t } = useI18n();
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div
        className={`${dims} bg-gradient-primary rounded-xl grid place-items-center shadow-glow relative overflow-hidden`}
      >
        <Sparkles className="h-4 w-4 text-primary-foreground" />
        <div className="absolute inset-0 bg-gradient-gold opacity-0 group-hover:opacity-30 transition-opacity" />
      </div>
      <span className={`${text} font-display font-bold tracking-tight`}>
        {t("brand.name")}
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function LocaleToggle() {
  const { locale, toggle } = useI18n();
  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5">
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold">{locale === "en" ? "AR" : "EN"}</span>
    </Button>
  );
}
