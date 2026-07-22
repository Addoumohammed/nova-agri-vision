/**
 * Pure formatters + status calculators for the Inventory module. No I/O.
 */
import type { StockStatus } from "./types";

const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatQuantity(n: number, unit: string): string {
  if (!Number.isFinite(n)) return "—";
  return `${qtyFmt.format(n)} ${unit}`;
}

export function formatCompact(n: number, unit: string): string {
  if (!Number.isFinite(n)) return "—";
  return `${compact.format(n)} ${unit}`;
}

/**
 * Compute stock status from quantity / reserved / low-stock threshold.
 * - out: available ≤ 0
 * - low: available ≤ threshold (and threshold > 0)
 * - ok:  otherwise
 */
export function computeStatus(
  quantity: number,
  reserved: number,
  threshold: number,
): StockStatus {
  const available = Math.max(0, quantity - reserved);
  if (available <= 0) return "out";
  if (threshold > 0 && available <= threshold) return "low";
  return "ok";
}

export function computeAvailable(quantity: number, reserved: number): number {
  return Math.max(0, (quantity || 0) - (reserved || 0));
}
