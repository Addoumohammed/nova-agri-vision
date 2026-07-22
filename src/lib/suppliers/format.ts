/**
 * Formatters for the Suppliers module. Pure — no I/O.
 */
const compactNum = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatRating(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toFixed(1);
}
export function formatCapacity(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `${compactNum.format(n)} MT / mo`;
}
export function formatLeadTime(d: number | null): string {
  if (d == null || !Number.isFinite(d) || d < 0) return "—";
  if (d === 0) return "Same-day";
  return `${d}d`;
}
export function formatContractValue(n: number): string {
  return Number.isFinite(n) ? usd.format(n) : "—";
}
export function supplierInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
}
