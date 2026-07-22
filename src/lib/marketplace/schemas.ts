/**
 * Zod schemas for the marketplace domain. Shared by client-side validation
 * and server-function `inputValidator`s so both sides enforce identical rules.
 */
import { z } from "zod";
import { INCOTERMS, MAX_MESSAGE_LEN, MAX_SUBJECT_LEN, PAGE_SIZE, UNITS } from "./constants";

export const sortSchema = z.enum(["relevance", "price_asc", "price_desc", "newest", "stock"]);

export const listMarketplaceSchema = z.object({
  q: z.string().trim().max(120).default(""),
  category: z.string().trim().max(80).default(""),
  country: z.string().trim().max(2).default(""),
  sort: sortSchema.default("relevance"),
  page: z.number().int().min(1).max(999).default(1),
  pageSize: z.number().int().min(1).max(60).default(PAGE_SIZE),
});

export type ListMarketplaceInput = z.infer<typeof listMarketplaceSchema>;

export const productIdSchema = z.object({ id: z.string().uuid() });

export const requestQuoteSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive().max(1_000_000),
  unit: z.enum(UNITS).default("MT"),
  targetPrice: z.number().positive().max(10_000_000).optional(),
  incoterm: z.enum(INCOTERMS).default("FOB"),
  destinationCountry: z.string().trim().length(2).toUpperCase().optional(),
  destinationPort: z.string().trim().max(120).optional(),
  message: z.string().trim().max(MAX_MESSAGE_LEN).optional(),
  deadline: z.string().trim().optional(), // ISO date; validated by DB
});

export type RequestQuoteInput = z.infer<typeof requestQuoteSchema>;

export const contactSupplierSchema = z.object({
  productId: z.string().uuid(),
  subject: z.string().trim().min(3).max(MAX_SUBJECT_LEN),
  body: z.string().trim().min(3).max(MAX_MESSAGE_LEN),
});

export type ContactSupplierInput = z.infer<typeof contactSupplierSchema>;
