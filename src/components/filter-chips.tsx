import { cn } from "@/lib/utils";

export function FilterChips<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-glow"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
