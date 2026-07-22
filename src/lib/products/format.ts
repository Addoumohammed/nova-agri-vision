/**
 * Pure formatters for the products module. Pure functions only — no I/O.
 */
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const qty = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatMoney(n: number): string {
  return Number.isFinite(n) ? usd.format(n) : "—";
}
export function formatQty(n: number, unit: string): string {
  return Number.isFinite(n) ? `${qty.format(n)} ${unit}` : "—";
}
export function formatStock(n: number, unit: string): string {
  return Number.isFinite(n) ? `${compact.format(n)} ${unit}` : "—";
}
export function stockLevel(stock: number, moq: number): "out" | "low" | "ok" {
  if (stock <= 0) return "out";
  if (moq > 0 && stock < moq * 2) return "low";
  return "ok";
}
