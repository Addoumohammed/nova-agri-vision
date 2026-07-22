export const FARMS_PAGE_SIZE = 12;
export const MAX_NAME_LEN = 120;
export const MAX_DESC_LEN = 2000;
export const MAX_NOTES_LEN = 2000;

export const FARM_STATUSES = ["active", "inactive", "planning"] as const;
export const FIELD_STATUSES = [
  "planned", "planted", "growing", "harvested", "fallow",
] as const;
export const ACTIVITY_TYPES = [
  "planting", "irrigation", "fertilization", "pest_control",
  "harvesting", "maintenance", "inspection", "other",
] as const;
export const DOCUMENT_TYPES = [
  "certification", "land_title", "inspection", "license",
  "insurance", "contract", "other",
] as const;

export const IRRIGATION_TYPES = [
  "drip", "sprinkler", "flood", "pivot", "rain_fed", "manual", "other",
] as const;

export const SOIL_TYPES = [
  "sandy", "loamy", "clay", "silt", "peat", "chalky", "mixed",
] as const;
