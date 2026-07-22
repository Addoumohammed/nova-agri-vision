/**
 * Pure formatting helpers for marketplace UI. No side effects, no I/O.
 */
import { COUNTRY_INDEX } from "./constants";

const priceFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatPrice(usd: number): string {
  if (!Number.isFinite(usd)) return "—";
  return priceFmt.format(usd);
}

export function formatPricePerUnit(usd: number, unit: string): string {
  return `${formatPrice(usd)} / ${unit}`;
}

export function formatQty(n: number, unit: string): string {
  if (!Number.isFinite(n)) return "—";
  return `${compactFmt.format(n)} ${unit}`;
}

export function originLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const opt = COUNTRY_INDEX[iso.toUpperCase()];
  return opt ? `${opt.flag} ${opt.name}` : iso;
}

export function relativeDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.round((now - then) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days)) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
