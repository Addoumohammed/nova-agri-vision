/**
 * Farmers module — server functions.
 *
 * All queries run under the caller's Supabase client (RLS enforced).
 * Farms are owner-scoped; child rows (fields/activities/documents) are
 * gated via EXISTS on farms.owner_id in the RLS policies.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteChildSchema,
  farmIdSchema,
  listFarmsSchema,
  upsertActivitySchema,
  upsertDocumentSchema,
  upsertFarmSchema,
  upsertFieldSchema,
} from "./farms/schemas";
import type {
  FarmActivity, FarmDetail, FarmDocument, FarmField,
  FarmListPage, FarmRecord, FarmStats,
} from "./farms/types";

type AnyClient = SupabaseClient<any, "public", any>;
const asAny = (c: unknown): AnyClient => c as AnyClient;

const FARM_COLS =
  "id, owner_id, code, name, description, country, region, address, latitude, longitude, area_hectares, crops, certifications, soil_type, irrigation_type, status, contact_name, contact_phone, contact_email, created_at, updated_at";

function mapFarm(
  r: any,
  counts: { fields?: number; activities?: number; documents?: number } = {},
): FarmRecord {
  return {
    id: r.id,
    ownerId: r.owner_id,
    code: r.code ?? null,
    name: r.name,
    description: r.description ?? null,
    country: r.country ?? null,
    region: r.region ?? null,
    address: r.address ?? null,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    areaHectares: r.area_hectares != null ? Number(r.area_hectares) : null,
    crops: Array.isArray(r.crops) ? r.crops : [],
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    soilType: r.soil_type ?? null,
    irrigationType: r.irrigation_type ?? null,
    status: (r.status ?? "active") as FarmRecord["status"],
    contactName: r.contact_name ?? null,
    contactPhone: r.contact_phone ?? null,
    contactEmail: r.contact_email ?? null,
    fieldsCount: counts.fields ?? 0,
    activitiesCount: counts.activities ?? 0,
    documentsCount: counts.documents ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapField(r: any): FarmField {
  return {
    id: r.id,
    farmId: r.farm_id,
    name: r.name,
    areaHectares: r.area_hectares != null ? Number(r.area_hectares) : null,
    crop: r.crop ?? null,
    variety: r.variety ?? null,
    plantingDate: r.planting_date ?? null,
    expectedHarvestDate: r.expected_harvest_date ?? null,
    status: r.status,
    notes: r.notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapActivity(r: any): FarmActivity {
  return {
    id: r.id,
    farmId: r.farm_id,
    fieldId: r.field_id ?? null,
    activityType: r.activity_type,
    title: r.title,
    notes: r.notes ?? null,
    occurredAt: r.occurred_at,
    cost: r.cost != null ? Number(r.cost) : null,
    currency: r.currency ?? null,
    createdAt: r.created_at,
  };
}

function mapDocument(r: any): FarmDocument {
  return {
    id: r.id,
    farmId: r.farm_id,
    title: r.title,
    docType: r.doc_type,
    url: r.url ?? null,
    issuedAt: r.issued_at ?? null,
    expiresAt: r.expires_at ?? null,
    createdAt: r.created_at,
  };
}

async function countBy(
  supabase: AnyClient,
  table: string,
  farmIds: string[],
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (farmIds.length === 0) return m;
  const { data, error } = await supabase
    .from(table)
    .select("farm_id")
    .in("farm_id", farmIds);
  if (error) return m;
  for (const row of (data ?? []) as { farm_id: string }[]) {
    m.set(row.farm_id, (m.get(row.farm_id) ?? 0) + 1);
  }
  return m;
}

// ---------- list ----------
export const listFarms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listFarmsSchema.parse(data))
  .handler(async ({ data, context }): Promise<FarmListPage> => {
    const supabase = asAny(context.supabase);
    let query = supabase
      .from("farms")
      .select(FARM_COLS, { count: "exact" })
      .eq("owner_id", context.userId);

    if (data.q) query = query.ilike("name", `%${data.q}%`);
    if (data.country) query = query.eq("country", data.country);
    if (data.status) query = query.eq("status", data.status);
    if (data.crop) query = query.contains("crops", [data.crop]);

    switch (data.sort) {
      case "oldest": query = query.order("created_at", { ascending: true }); break;
      case "name_asc": query = query.order("name", { ascending: true }); break;
      case "name_desc": query = query.order("name", { ascending: false }); break;
      case "area_desc": query = query.order("area_hectares", { ascending: false, nullsFirst: false }); break;
      case "area_asc": query = query.order("area_hectares", { ascending: true, nullsFirst: false }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    const [fieldCounts, actCounts, docCounts] = await Promise.all([
      countBy(supabase, "farm_fields", ids),
      countBy(supabase, "farm_activities", ids),
      countBy(supabase, "farm_documents", ids),
    ]);

    return {
      items: (rows ?? []).map((r: any) => mapFarm(r, {
        fields: fieldCounts.get(r.id) ?? 0,
        activities: actCounts.get(r.id) ?? 0,
        documents: docCounts.get(r.id) ?? 0,
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

// ---------- stats ----------
export const getFarmStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FarmStats> => {
    const supabase = asAny(context.supabase);
    const { data: farms } = await supabase
      .from("farms")
      .select("id, area_hectares, country, status")
      .eq("owner_id", context.userId);
    const rows = (farms ?? []) as any[];
    const ids = rows.map((r) => r.id);
    const [{ count: fc }, { count: ac }, { count: dc }, { data: exp }] = await Promise.all([
      supabase.from("farm_fields").select("id", { count: "exact", head: true }).in("farm_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("farm_activities").select("id", { count: "exact", head: true }).in("farm_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("farm_documents").select("id", { count: "exact", head: true }).in("farm_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("farm_documents").select("expires_at").in("farm_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).not("expires_at", "is", null),
    ]);
    const soon = Date.now() + 30 * 86400000;
    const expiring = ((exp ?? []) as any[]).filter((r) => {
      const t = new Date(r.expires_at).getTime();
      return t >= Date.now() && t <= soon;
    }).length;
    return {
      totalFarms: rows.length,
      totalHectares: rows.reduce((s, r) => s + (Number(r.area_hectares) || 0), 0),
      activeFarms: rows.filter((r) => r.status === "active").length,
      countries: new Set(rows.map((r) => r.country).filter(Boolean)).size,
      fieldsCount: fc ?? 0,
      activitiesCount: ac ?? 0,
      documentsCount: dc ?? 0,
      expiringDocuments: expiring,
    };
  });

// ---------- detail ----------
export const getFarmDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => farmIdSchema.parse(data))
  .handler(async ({ data, context }): Promise<FarmDetail> => {
    const supabase = asAny(context.supabase);
    const { data: row, error } = await supabase
      .from("farms")
      .select(FARM_COLS)
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Farm not found");

    const [fields, activities, documents] = await Promise.all([
      supabase.from("farm_fields").select("*").eq("farm_id", data.id).order("created_at", { ascending: false }),
      supabase.from("farm_activities").select("*").eq("farm_id", data.id).order("occurred_at", { ascending: false }).limit(200),
      supabase.from("farm_documents").select("*").eq("farm_id", data.id).order("created_at", { ascending: false }),
    ]);

    const base = mapFarm(row, {
      fields: fields.data?.length ?? 0,
      activities: activities.data?.length ?? 0,
      documents: documents.data?.length ?? 0,
    });
    return {
      ...base,
      fields: (fields.data ?? []).map(mapField),
      activities: (activities.data ?? []).map(mapActivity),
      documents: (documents.data ?? []).map(mapDocument),
    };
  });

// ---------- upsert farm ----------
export const upsertFarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertFarmSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const supabase = asAny(context.supabase);
    const row: Record<string, unknown> = {
      owner_id: context.userId,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      country: data.country ?? null,
      region: data.region ?? null,
      address: data.address ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      area_hectares: data.areaHectares ?? null,
      crops: data.crops,
      certifications: data.certifications,
      soil_type: data.soilType ?? null,
      irrigation_type: data.irrigationType ?? null,
      status: data.status,
      contact_name: data.contactName ?? null,
      contact_phone: data.contactPhone ?? null,
      contact_email: data.contactEmail ?? null,
    };
    if (data.id) {
      const { data: res, error } = await supabase
        .from("farms").update(row).eq("id", data.id).eq("owner_id", context.userId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!res) throw new Error("Farm not found");
      return { id: res.id };
    }
    const { data: res, error } = await supabase.from("farms").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: res.id };
  });

// ---------- delete farm ----------
export const deleteFarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => farmIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = asAny(context.supabase);
    const { error } = await supabase.from("farms").delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- fields ----------
export const upsertField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertFieldSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const supabase = asAny(context.supabase);
    const row = {
      farm_id: data.farmId,
      name: data.name,
      area_hectares: data.areaHectares ?? null,
      crop: data.crop ?? null,
      variety: data.variety ?? null,
      planting_date: data.plantingDate ?? null,
      expected_harvest_date: data.expectedHarvestDate ?? null,
      status: data.status,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { data: res, error } = await supabase.from("farm_fields").update(row).eq("id", data.id).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!res) throw new Error("Field not found");
      return { id: res.id };
    }
    const { data: res, error } = await supabase.from("farm_fields").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: res.id };
  });

export const deleteField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteChildSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = asAny(context.supabase);
    const { error } = await supabase.from("farm_fields").delete().eq("id", data.id).eq("farm_id", data.farmId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- activities ----------
export const upsertActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertActivitySchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const supabase = asAny(context.supabase);
    const row = {
      farm_id: data.farmId,
      field_id: data.fieldId ?? null,
      activity_type: data.activityType,
      title: data.title,
      notes: data.notes ?? null,
      occurred_at: data.occurredAt,
      cost: data.cost ?? null,
      currency: data.currency ?? "USD",
      created_by: context.userId,
    };
    if (data.id) {
      const { data: res, error } = await supabase.from("farm_activities").update(row).eq("id", data.id).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!res) throw new Error("Activity not found");
      return { id: res.id };
    }
    const { data: res, error } = await supabase.from("farm_activities").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: res.id };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteChildSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = asAny(context.supabase);
    const { error } = await supabase.from("farm_activities").delete().eq("id", data.id).eq("farm_id", data.farmId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- documents ----------
export const upsertDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertDocumentSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const supabase = asAny(context.supabase);
    const row = {
      farm_id: data.farmId,
      title: data.title,
      doc_type: data.docType,
      url: data.url ?? null,
      issued_at: data.issuedAt ?? null,
      expires_at: data.expiresAt ?? null,
      uploader_id: context.userId,
    };
    if (data.id) {
      const { data: res, error } = await supabase.from("farm_documents").update(row).eq("id", data.id).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!res) throw new Error("Document not found");
      return { id: res.id };
    }
    const { data: res, error } = await supabase.from("farm_documents").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: res.id };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteChildSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = asAny(context.supabase);
    const { error } = await supabase.from("farm_documents").delete().eq("id", data.id).eq("farm_id", data.farmId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
