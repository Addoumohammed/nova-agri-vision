/**
 * Semantic status badge for orders — colour-coded per lifecycle stage.
 */
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ORDER_STATUS_LABEL_KEYS } from "@/lib/orders/constants";
import type { OrderStatus } from "@/lib/orders/types";

const TONE: Record<OrderStatus, string> = {
  draft:
    "bg-muted text-muted-foreground border-border",
  pending:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  confirmed:
    "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  shipped:
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  delivered:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cancelled:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {t(ORDER_STATUS_LABEL_KEYS[status] as never)}
    </span>
  );
}
