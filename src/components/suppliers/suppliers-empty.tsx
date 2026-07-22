/**
 * Empty-state card for the suppliers directory.
 */
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function SuppliersEmpty({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  const { t } = useI18n();
  const tr = t as unknown as (k: string) => string;
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold">{tr("suppliers.empty.title")}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{tr("suppliers.empty.desc")}</p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear} className="mt-4">
          {tr("suppliers.filter.clear")}
        </Button>
      )}
    </div>
  );
}
