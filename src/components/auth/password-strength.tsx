import { useMemo } from "react";
import { scorePassword } from "@/lib/auth/service";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const BAR_COUNT = 4;

/**
 * 4-bar visual password-strength meter with i18n label.
 * Purely reactive to `value` — no internal state.
 */
export function PasswordStrength({
  value,
  className,
  id,
}: {
  value: string;
  className?: string;
  id?: string;
}) {
  const { t } = useI18n();
  const strength = useMemo(() => scorePassword(value), [value]);
  const empty = value.length === 0;

  return (
    <div id={id} className={cn("space-y-1", className)}>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              !empty && i < strength.score ? strength.colorClass : "bg-muted",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("auth.password.strengthLabel")}</span>
        <span
          role="status"
          aria-live="polite"
          className={cn("font-medium", !empty && "text-foreground")}
        >
          {empty ? "" : t(strength.labelKey)}
        </span>
      </div>
    </div>
  );
}
