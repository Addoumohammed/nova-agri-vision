import { z } from "zod";
import {
  ACTIVITY_TYPES, DOCUMENT_TYPES, FARM_STATUSES, FARMS_PAGE_SIZE,
  FIELD_STATUSES, MAX_DESC_LEN, MAX_NAME_LEN, MAX_NOTES_LEN,
} from "./constants";

const uuid = z.string().uuid();
const optStr = (max: number) => z.string().trim().max(max).optional().or(z.literal("")).transform((s) => (s === "" ? undefined : s));
const optNum = z.union([z.coerce.number(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();
const optDate = z.string().trim().optional().or(z.literal("")).transform((s) => (s === "" ? undefined : s));

export const farmSortSchema = z.enum([
  "newest", "oldest", "name_asc", "name_desc", "area_desc", "area_asc",
]);

export const listFarmsSchema = z.object({
  q: z.string().trim().max(120).default(""),
  country: z.string().trim().max(2).transform((s) => s.toUpperCase()).default(""),
  crop: z.string().trim().max(80).default(""),
  status: z.enum(["", ...FARM_STATUSES]).default(""),
  sort: farmSortSchema.default("newest"),
  page: z.number().int().min(1).max(9999).default(1),
  pageSize: z.number().int().min(1).max(60).default(FARMS_PAGE_SIZE),
});
export type ListFarmsInput = z.infer<typeof listFarmsSchema>;

export const farmIdSchema = z.object({ id: uuid });

export const upsertFarmSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, { message: "farms.error.nameShort" }).max(MAX_NAME_LEN),
  code: optStr(40),
  description: optStr(MAX_DESC_LEN),
  country: z.string().trim().max(2).transform((s) => s.toUpperCase()).optional().or(z.literal("")).transform((s) => (s === "" ? undefined : s)),
  region: optStr(120),
  address: optStr(280),
  latitude: optNum,
  longitude: optNum,
  areaHectares: optNum,
  crops: z.array(z.string().trim().max(60)).max(40).default([]),
  certifications: z.array(z.string().trim().max(80)).max(40).default([]),
  soilType: optStr(40),
  irrigationType: optStr(40),
  status: z.enum(FARM_STATUSES).default("active"),
  contactName: optStr(120),
  contactPhone: optStr(40),
  contactEmail: z.string().trim().max(255).email({ message: "farms.error.email" }).optional().or(z.literal("")).transform((s) => (s === "" ? undefined : s)),
});
export type UpsertFarmInput = z.infer<typeof upsertFarmSchema>;

export const upsertFieldSchema = z.object({
  id: uuid.optional(),
  farmId: uuid,
  name: z.string().trim().min(1, { message: "farms.error.nameShort" }).max(MAX_NAME_LEN),
  areaHectares: optNum,
  crop: optStr(80),
  variety: optStr(80),
  plantingDate: optDate,
  expectedHarvestDate: optDate,
  status: z.enum(FIELD_STATUSES).default("planned"),
  notes: optStr(MAX_NOTES_LEN),
});
export type UpsertFieldInput = z.infer<typeof upsertFieldSchema>;

export const upsertActivitySchema = z.object({
  id: uuid.optional(),
  farmId: uuid,
  fieldId: uuid.optional().or(z.literal("")).transform((s) => (s === "" ? undefined : s)),
  activityType: z.enum(ACTIVITY_TYPES),
  title: z.string().trim().min(2, { message: "farms.error.titleShort" }).max(MAX_NAME_LEN),
  notes: optStr(MAX_NOTES_LEN),
  occurredAt: z.string().trim().min(1),
  cost: optNum,
  currency: optStr(8),
});
export type UpsertActivityInput = z.infer<typeof upsertActivitySchema>;

export const upsertDocumentSchema = z.object({
  id: uuid.optional(),
  farmId: uuid,
  title: z.string().trim().min(2, { message: "farms.error.titleShort" }).max(MAX_NAME_LEN),
  docType: z.enum(DOCUMENT_TYPES).default("other"),
  url: z.string().trim().max(2000).url({ message: "farms.error.url" }).optional().or(z.literal("")).transform((s) => (s === "" ? undefined : s)),
  issuedAt: optDate,
  expiresAt: optDate,
});
export type UpsertDocumentInput = z.infer<typeof upsertDocumentSchema>;

export const deleteChildSchema = z.object({ id: uuid, farmId: uuid });
export type DeleteChildInput = z.infer<typeof deleteChildSchema>;
