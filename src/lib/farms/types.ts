/**
 * Farmers domain types — decoupled from PostgREST rows.
 */
export type FarmStatus = "active" | "inactive" | "planning";
export type FieldStatus = "planned" | "planted" | "growing" | "harvested" | "fallow";
export type ActivityType =
  | "planting"
  | "irrigation"
  | "fertilization"
  | "pest_control"
  | "harvesting"
  | "maintenance"
  | "inspection"
  | "other";
export type DocumentType =
  | "certification"
  | "land_title"
  | "inspection"
  | "license"
  | "insurance"
  | "contract"
  | "other";

export type FarmSort =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "area_desc"
  | "area_asc";

export interface FarmRecord {
  id: string;
  ownerId: string;
  code: string | null;
  name: string;
  description: string | null;
  country: string | null;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  areaHectares: number | null;
  crops: string[];
  certifications: string[];
  soilType: string | null;
  irrigationType: string | null;
  status: FarmStatus;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  fieldsCount: number;
  activitiesCount: number;
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FarmField {
  id: string;
  farmId: string;
  name: string;
  areaHectares: number | null;
  crop: string | null;
  variety: string | null;
  plantingDate: string | null;
  expectedHarvestDate: string | null;
  status: FieldStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FarmActivity {
  id: string;
  farmId: string;
  fieldId: string | null;
  activityType: ActivityType;
  title: string;
  notes: string | null;
  occurredAt: string;
  cost: number | null;
  currency: string | null;
  createdAt: string;
}

export interface FarmDocument {
  id: string;
  farmId: string;
  title: string;
  docType: DocumentType;
  url: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface FarmDetail extends FarmRecord {
  fields: FarmField[];
  activities: FarmActivity[];
  documents: FarmDocument[];
}

export interface FarmListPage {
  items: FarmRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FarmFilters {
  q: string;
  country: string;
  crop: string;
  status: "" | FarmStatus;
  sort: FarmSort;
  page: number;
}

export interface FarmStats {
  totalFarms: number;
  totalHectares: number;
  activeFarms: number;
  countries: number;
  fieldsCount: number;
  activitiesCount: number;
  documentsCount: number;
  expiringDocuments: number;
}
