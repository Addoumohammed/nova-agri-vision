/**
 * Zod schemas shared between client form validation and server-fn
 * `inputValidator`s. Both sides enforce identical rules.
 */
import { z } from "zod";
import {
  MAX_DESC_LEN,
  MAX_MESSAGE_LEN,
  MAX_NAME_LEN,
  MAX_SUBJECT_LEN,
  SUPPLIERS_PAGE_SIZE,
  SUPPLIER_COMPANY_TYPES,
} from "./constants";

const uuid = z.string().uuid();

export const supplierSortSchema = z.enum([
  "newest", "oldest", "rating_desc", "rating_asc", "name_asc", "name_desc",
]);

export const listSuppliersSchema = z.object({
  q: z.string().trim().max(120).default(""),
  country: z.string().trim().max(2).transform((s) => s.toUpperCase()).default(""),
  category: z.string().trim().max(80).default(""),
  verifiedOnly: z.boolean().default(false),
  minRating: z.coerce.number().min(0).max(5).default(0),
  sort: supplierSortSchema.default("newest"),
  page: z.number().int().min(1).max(9999).default(1),
  pageSize: z.number().int().min(1).max(60).default(SUPPLIERS_PAGE_SIZE),
});
export type ListSuppliersInput = z.infer<typeof listSuppliersSchema>;

export const supplierIdSchema = z.object({ id: uuid });

const isoCountry = z
  .string().trim()
  .length(2, { message: "suppliers.error.country" })
  .transform((s) => s.toUpperCase())
  .optional().or(z.literal(""));

/**
 * Upsert the caller's supplier profile. Requires an owned company id.
 * Merges into `companies` (limited fields) and upserts the `suppliers`
 * extension row.
 */
export const upsertSupplierProfileSchema = z.object({
  companyId: uuid,
  // company fields
  type: z.enum(SUPPLIER_COMPANY_TYPES).default("supplier"),
  country: isoCountry,
  city: z.string().trim().max(120).optional().or(z.literal("")),
  website: z.string().trim().max(300).url({ message: "suppliers.error.url" }).optional().or(z.literal("")),
  email: z.string().trim().max(255).email({ message: "suppliers.error.email" }).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(MAX_DESC_LEN).optional().or(z.literal("")),
  employees: z.coerce.number().int().min(0).max(10_000_000).optional().or(z.literal("").transform(() => undefined)),
  founded: z.coerce.number().int().min(1800).max(new Date().getFullYear() + 1).optional().or(z.literal("").transform(() => undefined)),
  logoUrl: z.string().trim().max(2000).url().optional().or(z.literal("")),
  // supplier extension
  category: z.string().trim().max(80).optional().or(z.literal("")),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).optional().or(z.literal("").transform(() => undefined)),
  monthlyCapacityMt: z.coerce.number().min(0).max(1_000_000_000).optional().or(z.literal("").transform(() => undefined)),
  certifications: z.array(z.string().trim().max(80)).max(40).default([]),
});
export type UpsertSupplierProfileInput = z.infer<typeof upsertSupplierProfileSchema>;

/**
 * Contact a supplier — creates a message thread + first message.
 */
export const contactSupplierSchema = z.object({
  companyId: uuid,
  subject: z.string().trim().min(2, { message: "suppliers.error.subjectShort" }).max(MAX_SUBJECT_LEN),
  body: z.string().trim().min(2, { message: "suppliers.error.bodyShort" }).max(MAX_MESSAGE_LEN),
});
export type ContactSupplierInput = z.infer<typeof contactSupplierSchema>;

export const listSupplierContractsSchema = z.object({
  supplierCompanyId: uuid,
  page: z.number().int().min(1).max(9999).default(1),
  pageSize: z.number().int().min(1).max(60).default(15),
});
export type ListSupplierContractsInput = z.infer<typeof listSupplierContractsSchema>;

export const upsertCompanyBaseSchema = z.object({
  name: z.string().trim().min(2, { message: "suppliers.error.nameShort" }).max(MAX_NAME_LEN),
});
