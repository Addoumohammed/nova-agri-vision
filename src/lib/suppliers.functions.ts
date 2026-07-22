/**
 * Suppliers module — server functions.
 *
 * Layering:
 *   - listSuppliers / getSupplierDetail: browse directory (any authed user)
 *   - upsertMySupplierProfile: caller must own the target company
 *   - contactSupplier: creates a thread + first message between caller
 *     and the target supplier's owner
 *   - listSupplierContracts: contracts touching a supplier company, RLS
 *     restricts to counterparties the caller owns
 *
 * We rely on RLS everywhere and only relax when we need aggregate counts.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  contactSupplierSchema,
  listSuppliersSchema,
  listSupplierContractsSchema,
  supplierIdSchema,
  upsertSupplierProfileSchema,
} from "./suppliers/schemas";
import type {
  SupplierContract,
  SupplierDetail,
  SupplierListPage,
  SupplierRecord,
} from "./suppliers/types";

// PostgREST generic client cast — the generated Database type doesn't
// carry the full join shapes we return.
type AnyClient = SupabaseClient<any, "public", any>;
const asAny = (c: unknown): AnyClient => c as AnyClient;

const COMPANY_TYPES_IN_DIRECTORY = ["supplier", "exporter", "farm"] as const;

const COMPANY_COLS =
  "id, owner_id, name, slug, type, country, city, website, email, phone, logo_url, description, verified, rating, employees, founded, created_at, updated_at";

interface CompanyRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  type: string;
  country: string | null;
  city: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  verified: boolean | null;
  rating: number | null;
  employees: number | null;
  founded: number | null;
  created_at: string;
  updated_at: string;
}
interface SupplierExtRow {
  company_id: string;
  category: string | null;
  lead_time_days: number | null;
  monthly_capacity_mt: number | null;
  certifications: string[] | null;
}

function toRecord(
  c: CompanyRow,
  ext: SupplierExtRow | undefined,
  productsCount: number,
): SupplierRecord {
  return {
    id: c.id,
    ownerId: c.owner_id,
    name: c.name,
    slug: c.slug,
    type: (c.type as SupplierRecord["type"]) ?? "supplier",
    country: c.country,
    city: c.city,
    website: c.website,
    email: c.email,
    phone: c.phone,
    logoUrl: c.logo_url,
    description: c.description,
    verified: !!c.verified,
    rating: Number(c.rating ?? 0),
    employees: c.employees,
    founded: c.founded,
    category: ext?.category ?? null,
    leadTimeDays: ext?.lead_time_days ?? null,
    monthlyCapacityMt: ext?.monthly_capacity_mt ?? null,
    certifications: ext?.certifications ?? [],
    productsCount,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

// ---------------------------------------------------------------------------
// listSuppliers
// ---------------------------------------------------------------------------
export const listSuppliers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listSuppliersSchema.parse(i))
  .handler(async ({ data, context }): Promise<SupplierListPage> => {
    const client = asAny(context.supabase);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = client
      .from("companies")
      .select(COMPANY_COLS, { count: "exact" })
      .in("type", COMPANY_TYPES_IN_DIRECTORY as unknown as string[]);

    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.country) q = q.eq("country", data.country);
    if (data.verifiedOnly) q = q.eq("verified", true);
    if (data.minRating > 0) q = q.gte("rating", data.minRating);

    switch (data.sort) {
      case "oldest":       q = q.order("created_at", { ascending: true }); break;
      case "rating_desc":  q = q.order("rating", { ascending: false, nullsFirst: false }); break;
      case "rating_asc":   q = q.order("rating", { ascending: true, nullsFirst: false }); break;
      case "name_asc":     q = q.order("name", { ascending: true }); break;
      case "name_desc":    q = q.order("name", { ascending: false }); break;
      default:             q = q.order("created_at", { ascending: false });
    }
    q = q.range(from, to);

    const { data: companies, count, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (companies ?? []) as CompanyRow[];
    if (rows.length === 0) {
      return { items: [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
    }

    const ids = rows.map((r) => r.id);

    // suppliers extension rows (may be missing)
    const { data: extsRaw, error: extErr } = await client
      .from("suppliers")
      .select("company_id, category, lead_time_days, monthly_capacity_mt, certifications")
      .in("company_id", ids);
    if (extErr) throw new Error(extErr.message);
    const exts = new Map<string, SupplierExtRow>();
    for (const e of (extsRaw ?? []) as SupplierExtRow[]) exts.set(e.company_id, e);

    // Category filter is applied after fetching extensions (small page).
    let filtered = rows;
    if (data.category) {
      filtered = rows.filter((r) => (exts.get(r.id)?.category ?? "") === data.category);
    }

    // Active product counts per supplier — one query, grouped client-side.
    const { data: prodRows, error: pErr } = await client
      .from("products")
      .select("supplier_company_id")
      .in("supplier_company_id", ids)
      .eq("active", true);
    if (pErr) throw new Error(pErr.message);
    const productCounts = new Map<string, number>();
    for (const p of (prodRows ?? []) as Array<{ supplier_company_id: string }>) {
      productCounts.set(p.supplier_company_id, (productCounts.get(p.supplier_company_id) ?? 0) + 1);
    }

    const items = filtered.map((c) =>
      toRecord(c, exts.get(c.id), productCounts.get(c.id) ?? 0),
    );

    return { items, total: count ?? items.length, page: data.page, pageSize: data.pageSize };
  });

// ---------------------------------------------------------------------------
// getSupplierDetail
// ---------------------------------------------------------------------------
export const getSupplierDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => supplierIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<SupplierDetail | null> => {
    const client = asAny(context.supabase);
    const { data: company, error } = await client
      .from("companies").select(COMPANY_COLS).eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!company) return null;
    const c = company as CompanyRow;

    const [{ data: ext }, { count: productsCount }, { count: ordersCount }, { count: activeContractsCount }] =
      await Promise.all([
        client.from("suppliers")
          .select("company_id, category, lead_time_days, monthly_capacity_mt, certifications")
          .eq("company_id", c.id).maybeSingle(),
        client.from("products").select("id", { count: "exact", head: true })
          .eq("supplier_company_id", c.id).eq("active", true),
        client.from("orders").select("id", { count: "exact", head: true })
          .eq("supplier_company_id", c.id),
        client.from("contracts").select("id", { count: "exact", head: true })
          .eq("supplier_company_id", c.id).eq("status", "active"),
      ]);

    const rec = toRecord(c, (ext ?? undefined) as SupplierExtRow | undefined, productsCount ?? 0);
    return {
      ...rec,
      ordersCount: ordersCount ?? 0,
      activeContractsCount: activeContractsCount ?? 0,
      isMine: c.owner_id === context.userId,
    };
  });

// ---------------------------------------------------------------------------
// upsertMySupplierProfile
// ---------------------------------------------------------------------------
export const upsertMySupplierProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => upsertSupplierProfileSchema.parse(i))
  .handler(async ({ data, context }) => {
    const client = asAny(context.supabase);

    // Ownership guard — even though RLS enforces it, we return a clean error.
    const { data: existing, error: cErr } = await client
      .from("companies").select("id, owner_id")
      .eq("id", data.companyId).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!existing) throw new Error("suppliers.error.notFound");
    if ((existing as { owner_id: string }).owner_id !== context.userId) {
      throw new Error("suppliers.error.notOwner");
    }

    const companyPatch: Record<string, unknown> = { type: data.type };
    if (data.country !== undefined)     companyPatch.country     = data.country || null;
    if (data.city !== undefined)        companyPatch.city        = data.city || null;
    if (data.website !== undefined)     companyPatch.website     = data.website || null;
    if (data.email !== undefined)       companyPatch.email       = data.email || null;
    if (data.phone !== undefined)       companyPatch.phone       = data.phone || null;
    if (data.description !== undefined) companyPatch.description = data.description || null;
    if (data.employees !== undefined)   companyPatch.employees   = data.employees ?? null;
    if (data.founded !== undefined)     companyPatch.founded     = data.founded ?? null;
    if (data.logoUrl !== undefined)     companyPatch.logo_url    = data.logoUrl || null;

    const { error: upErr } = await client
      .from("companies").update(companyPatch).eq("id", data.companyId);
    if (upErr) throw new Error(upErr.message);

    const extPayload = {
      company_id: data.companyId,
      category: data.category || null,
      lead_time_days: data.leadTimeDays ?? null,
      monthly_capacity_mt: data.monthlyCapacityMt ?? null,
      certifications: data.certifications ?? [],
    };
    const { error: extErr } = await client
      .from("suppliers").upsert(extPayload, { onConflict: "company_id" });
    if (extErr) throw new Error(extErr.message);

    return { ok: true, companyId: data.companyId };
  });

// ---------------------------------------------------------------------------
// listMyOwnedCompanies — for the profile picker
// ---------------------------------------------------------------------------
export const listMyOwnedCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = asAny(context.supabase);
    const { data, error } = await client
      .from("companies")
      .select("id, name, type, country, verified")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string; name: string; type: string; country: string | null; verified: boolean | null;
    }>;
  });

// ---------------------------------------------------------------------------
// contactSupplier — thread + first message
// ---------------------------------------------------------------------------
export const contactSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => contactSupplierSchema.parse(i))
  .handler(async ({ data, context }) => {
    const client = asAny(context.supabase);

    const { data: company, error: cErr } = await client
      .from("companies").select("id, owner_id, name").eq("id", data.companyId).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!company) throw new Error("suppliers.error.notFound");
    const supplier = company as { id: string; owner_id: string; name: string };
    if (supplier.owner_id === context.userId) {
      throw new Error("suppliers.error.selfContact");
    }

    const { data: thread, error: thrErr } = await client
      .from("message_threads")
      .insert({ subject: data.subject, created_by: context.userId })
      .select("id").single();
    if (thrErr) throw new Error(thrErr.message);
    const threadId = (thread as { id: string }).id;

    const { error: partErr } = await client
      .from("thread_participants")
      .upsert(
        [
          { thread_id: threadId, user_id: context.userId },
          { thread_id: threadId, user_id: supplier.owner_id },
        ],
        { onConflict: "thread_id,user_id", ignoreDuplicates: true },
      );
    if (partErr) throw new Error(partErr.message);

    const { error: msgErr } = await client
      .from("messages")
      .insert({ thread_id: threadId, sender_id: context.userId, body: data.body });
    if (msgErr) throw new Error(msgErr.message);

    return { threadId };
  });

// ---------------------------------------------------------------------------
// listSupplierContracts — RLS restricts to buyer/supplier counterparties
// the caller owns; from a browser context this typically returns [] unless
// the caller owns the buyer or the supplier side.
// ---------------------------------------------------------------------------
export const listSupplierContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listSupplierContractsSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ items: SupplierContract[]; total: number }> => {
    const client = asAny(context.supabase);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: rows, count, error } = await client
      .from("contracts")
      .select(
        "id, title, status, value_usd, start_date, end_date, buyer_company_id, supplier_company_id, created_at, buyer:companies!contracts_buyer_company_id_fkey(name), supplier:companies!contracts_supplier_company_id_fkey(name)",
        { count: "exact" },
      )
      .eq("supplier_company_id", data.supplierCompanyId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    type Row = {
      id: string; title: string; status: SupplierContract["status"]; value_usd: number | null;
      start_date: string | null; end_date: string | null;
      buyer_company_id: string; supplier_company_id: string; created_at: string;
      buyer: { name: string | null } | null; supplier: { name: string | null } | null;
    };
    const items: SupplierContract[] = ((rows ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      valueUsd: Number(r.value_usd ?? 0),
      startDate: r.start_date,
      endDate: r.end_date,
      buyerCompanyId: r.buyer_company_id,
      supplierCompanyId: r.supplier_company_id,
      buyerCompanyName: r.buyer?.name ?? null,
      supplierCompanyName: r.supplier?.name ?? null,
      createdAt: r.created_at,
    }));
    return { items, total: count ?? items.length };
  });
