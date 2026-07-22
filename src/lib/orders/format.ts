/**
 * Pure pricing helpers — used by client (live totals) and server (persisted
 * totals) so a discount/tax calculation can only diverge if this file is
 * edited. No side effects, no imports.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PricingInput {
  items: ReadonlyArray<{ quantity: number; unitPriceUsd: number }>;
  discountPct: number;
  taxPct: number;
}

export interface PricingResult {
  subtotalUsd: number;
  discountUsd: number;
  taxableUsd: number;
  taxUsd: number;
  totalUsd: number;
}

/**
 * Deterministic order of operations:
 *   subtotal   = Σ qty * unit_price
 *   discount   = subtotal * discount_pct / 100
 *   taxable    = subtotal − discount
 *   tax        = taxable * tax_pct / 100
 *   total      = taxable + tax
 * Every intermediate value is rounded to 2 dp before the next step so the
 * persisted totals match what the UI shows.
 */
export function computePricing(input: PricingInput): PricingResult {
  const clampPct = (p: number) => (Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0);
  const discountPct = clampPct(input.discountPct);
  const taxPct = clampPct(input.taxPct);

  const subtotalUsd = round2(
    input.items.reduce((sum, line) => {
      const q = Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0;
      const p = Number.isFinite(line.unitPriceUsd) ? Math.max(0, line.unitPriceUsd) : 0;
      return sum + q * p;
    }, 0),
  );
  const discountUsd = round2((subtotalUsd * discountPct) / 100);
  const taxableUsd = round2(Math.max(0, subtotalUsd - discountUsd));
  const taxUsd = round2((taxableUsd * taxPct) / 100);
  const totalUsd = round2(taxableUsd + taxUsd);
  return { subtotalUsd, discountUsd, taxableUsd, taxUsd, totalUsd };
}

/** USD money formatter — never throws on bad input. */
export function formatMoney(amount: number, currency = "USD", locale = "en-US"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatQuantity(qty: number, unit: string, locale = "en-US"): string {
  const value = Number.isFinite(qty) ? qty : 0;
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  return `${num} ${unit}`;
}
