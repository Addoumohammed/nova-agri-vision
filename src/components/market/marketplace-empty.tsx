/**
 * Marketplace empty state. Shown when filters produce zero results.
 */
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasFilters: boolean;
  onClear: () => void;
}

export function MarketplaceEmpty({ hasFilters, onClear }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="rounded-full bg-muted p-4">
        <PackageSearch className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <h3 className="text-base font-semibold">No products match your search</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? "Try widening your filters, or clear them to see the full catalog."
            : "The catalog is currently empty. Verified suppliers will appear here."}
        </p>
      </div>
      {hasFilters && (
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
