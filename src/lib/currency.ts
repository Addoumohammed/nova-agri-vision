// Currency helpers + React hook backed by the /api/public/currency endpoint via getExchangeRates.
import { useEffect, useState } from "react";
import { getExchangeRates } from "@/lib/trade.functions";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "AED" | "SAR" | "EGP" | "CNY" | "JPY" | "INR" | "BRL" | "MAD" | "TRY" | "KES" | "NGN" | "CAD" | "AUD" | "ZAR";

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MAD", symbol: "DH", name: "Moroccan Dirham" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
];

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  // Rates are keyed base = USD. rate[X] = X per 1 USD.
  const fr = from === "USD" ? 1 : rates[from];
  const tr = to === "USD" ? 1 : rates[to];
  if (!fr || !tr) return amount;
  const usd = amount / fr;
  return usd * tr;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function useExchangeRates() {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getExchangeRates();
        if (!cancelled) setRates(res.rates);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { rates, loading, error };
}

// Realistic shipping cost estimator (public rate benchmarks, USD).
export type ShipMode = "sea_fcl_20" | "sea_fcl_40" | "sea_lcl" | "air" | "truck";

export type ShipInput = {
  mode: ShipMode;
  weight_kg: number;
  volume_cbm?: number;
  distance_km: number;
};

export function estimateShippingCost(input: ShipInput): { cost_usd: number; transit_days: number; breakdown: string } {
  const { mode, weight_kg, volume_cbm = 0, distance_km } = input;
  switch (mode) {
    case "sea_fcl_20": {
      const base = 1200;
      const perKm = 0.35;
      const cost = base + perKm * distance_km;
      return { cost_usd: cost, transit_days: Math.round(distance_km / 700) + 5, breakdown: `Base $${base} + $0.35/km × ${distance_km} km` };
    }
    case "sea_fcl_40": {
      const base = 2000;
      const perKm = 0.55;
      const cost = base + perKm * distance_km;
      return { cost_usd: cost, transit_days: Math.round(distance_km / 700) + 5, breakdown: `Base $${base} + $0.55/km × ${distance_km} km` };
    }
    case "sea_lcl": {
      const cbm = Math.max(volume_cbm, weight_kg / 1000);
      const cost = 85 * cbm + 0.02 * distance_km + 150;
      return { cost_usd: cost, transit_days: Math.round(distance_km / 600) + 8, breakdown: `$85/CBM × ${cbm.toFixed(1)} + $0.02/km × ${distance_km}` };
    }
    case "air": {
      const chargeable = Math.max(weight_kg, volume_cbm * 167);
      const rate = distance_km < 3000 ? 3.2 : distance_km < 8000 ? 4.5 : 5.8;
      const cost = chargeable * rate + 120;
      return { cost_usd: cost, transit_days: 3, breakdown: `${chargeable.toFixed(0)} kg × $${rate}/kg + $120 handling` };
    }
    case "truck": {
      const cost = 1.4 * distance_km + 0.08 * weight_kg;
      return { cost_usd: cost, transit_days: Math.round(distance_km / 700) + 1, breakdown: `$1.40/km × ${distance_km} + $0.08/kg × ${weight_kg}` };
    }
  }
}
