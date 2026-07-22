import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "error" | "info" | "success";

const VARIANTS: Record<Variant, { className: string; icon: typeof AlertCircle; role: "alert" | "status" }> = {
  error: {
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: AlertCircle,
    role: "alert",
  },
  info: {
    className: "border-primary/30 bg-primary/5 text-muted-foreground",
    icon: Info,
    role: "status",
  },
  success: {
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
    role: "status",
  },
};

/**
 * Accessible, variant-based form-level alert. Announces via role="alert" for
 * errors and role="status" for informational messages.
 */
export function FormAlert({
  variant = "error",
  children,
  className,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  return (
    <div
      role={v.role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", v.className, className)}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
