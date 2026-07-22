import type { ActivityType, DocumentType, FarmStatus, FieldStatus } from "./types";

export function fmtHa(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v)} ha`;
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function statusTone(s: FarmStatus): "success" | "muted" | "info" {
  return s === "active" ? "success" : s === "planning" ? "info" : "muted";
}

export function fieldStatusTone(s: FieldStatus): "success" | "info" | "warning" | "muted" {
  switch (s) {
    case "growing":
    case "planted":
      return "success";
    case "harvested":
      return "info";
    case "planned":
      return "warning";
    default:
      return "muted";
  }
}

export function activityTone(t: ActivityType): "success" | "info" | "warning" | "muted" {
  switch (t) {
    case "harvesting": return "success";
    case "pest_control": return "warning";
    case "planting":
    case "irrigation":
    case "fertilization": return "info";
    default: return "muted";
  }
}

export function docTone(_t: DocumentType, expiresAt: string | null): "success" | "warning" | "danger" | "muted" {
  if (!expiresAt) return "muted";
  const days = Math.round((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return "danger";
  if (days < 30) return "warning";
  return "success";
}
