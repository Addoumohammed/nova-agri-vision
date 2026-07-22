/**
 * Marketplace constants. Single source of truth for enums, page size, and
 * lookup tables consumed by both the UI and the service layer.
 */
import type { SortOption } from "./types";

export const PAGE_SIZE = 12;

export const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; labelKey: string }> = [
  { value: "relevance", labelKey: "marketplace.sort.relevance" },
  { value: "newest",    labelKey: "marketplace.sort.newest" },
  { value: "price_asc", labelKey: "marketplace.sort.priceAsc" },
  { value: "price_desc",labelKey: "marketplace.sort.priceDesc" },
  { value: "stock",     labelKey: "marketplace.sort.stock" },
] as const;

/** Matches public.incoterm enum on the DB. */
export const INCOTERMS = ["EXW","FCA","FAS","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"] as const;
export type Incoterm = (typeof INCOTERMS)[number];

/** Trade units we support in quotations / RFQs. */
export const UNITS = ["MT","KG","L","BAG","PALLET","CONTAINER"] as const;

/**
 * Origin countries used by the filter chips. The full ISO list is available
 * separately for RFQ destination pickers; this short list is deliberate
 * because it matches the seeded catalog and every future supplier we add.
 */
export interface CountryOption {
  iso: string;
  name: string;
  flag: string;
}

export const ORIGIN_COUNTRIES: readonly CountryOption[] = [
  { iso: "EG", name: "Egypt",    flag: "🇪🇬" },
  { iso: "CO", name: "Colombia", flag: "🇨🇴" },
  { iso: "IN", name: "India",    flag: "🇮🇳" },
  { iso: "BR", name: "Brazil",   flag: "🇧🇷" },
  { iso: "KE", name: "Kenya",    flag: "🇰🇪" },
  { iso: "US", name: "USA",      flag: "🇺🇸" },
  { iso: "CL", name: "Chile",    flag: "🇨🇱" },
  { iso: "MA", name: "Morocco",  flag: "🇲🇦" },
  { iso: "TR", name: "Turkey",   flag: "🇹🇷" },
  { iso: "ZA", name: "S. Africa",flag: "🇿🇦" },
] as const;

export const COUNTRY_INDEX: Record<string, CountryOption> = Object.fromEntries(
  ORIGIN_COUNTRIES.map((c) => [c.iso, c]),
);

/** Regex-safe max lengths used across marketplace forms. */
export const MAX_MESSAGE_LEN = 2000;
export const MAX_SUBJECT_LEN = 140;
