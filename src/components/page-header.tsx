import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between mb-6">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="hidden sm:grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl font-display font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
