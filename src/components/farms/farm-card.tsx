/**
 * Farm summary card — directory tile. Click opens the detail sheet.
 */
import { BadgeCheck, Layers, MapPin, Sprout, Ruler, FileText } from "lucide-react";
import type { FarmRecord } from "@/lib/farms/types";
import { fmtHa, statusTone } from "@/lib/farms/format";
import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/25",
  info: "bg-blue-500/15 text-blue-500 ring-blue-500/25",
  muted: "bg-muted text-muted-foreground ring-border",
};

interface Props {
  farm: FarmRecord;
  onOpen: (f: FarmRecord) => void;
}

export function FarmCard({ farm, onOpen }: Props) {
  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-elegant transition",
        "hover:border-primary/50 hover:shadow-glow focus-within:ring-2 focus-within:ring-primary",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(farm)}
        className="text-start"
        aria-label={`Open ${farm.name}`}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Sprout className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold group-hover:text-primary">{farm.name}</h3>
              {farm.certifications.length > 0 && (
                <BadgeCheck className="h-4 w-4 text-primary" aria-label="Certified" />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden />
              <span className="truncate">
                {[farm.region, farm.country].filter(Boolean).join(", ") || farm.address || "—"}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1",
                toneMap[statusTone(farm.status)],
              )}>{farm.status}</span>
              {farm.code && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {farm.code}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Metric icon={<Ruler className="h-3 w-3 text-primary" />} value={fmtHa(farm.areaHectares)} label="Area" />
        <Metric icon={<Layers className="h-3 w-3 text-primary" />} value={String(farm.fieldsCount)} label="Fields" />
        <Metric icon={<FileText className="h-3 w-3 text-primary" />} value={String(farm.documentsCount)} label="Docs" />
      </div>

      {farm.crops.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {farm.crops.slice(0, 4).map((c) => (
            <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {c}
            </span>
          ))}
          {farm.crops.length > 4 && (
            <span className="text-[11px] text-muted-foreground">+{farm.crops.length - 4}</span>
          )}
        </div>
      )}
    </article>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-lg bg-muted/50 py-1.5">
      <div className="inline-flex items-center gap-1 font-medium">{icon}{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
