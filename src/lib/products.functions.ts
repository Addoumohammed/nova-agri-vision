/**
 * Products data layer (supplier-facing management).
 *
 * The only module that talks to Supabase for product mutations. Every write
 * runs under the caller's RLS — the `products write owner` policy scopes it
 * to companies owned by the caller (or admins). We never bypass that.
 *
 * Returns typed DTOs — the UI never sees raw PostgREST rows.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createProductSchema,
  listProductsSchema,
  productIdSchema,
  setActiveSchema,
  updateProductSchema,
} from "@/lib/products/schemas";
import type {
  OwnedCompany,
  ProductCategoryLite,
  ProductListPage,
  ProductRecord,
} from "@/lib/products/types";

// The generated Database types don't yet include every trade table; the
// runtime PostgREST shapes match our schema, so we widen inside this file.
const asAny = (c: unknown) => c as unknown as SupabaseClient;

interface Row {
  id: string;
  supplier_company_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  origin_country: string | null;
  unit: string;
  price_usd: number | string;
  moq: number | string;
  stock: number | string;
  images: string[] | null;
  active: boolean;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string; slug: string } | null;
  supplier: { id: string; name: string } | null;
}

const SELECT = `
  id, supplier_company_id, name, sku, description, origin_country, unit,
  price_usd, moq, stock, images, active, category_id, created_at, updated_at,
  category:product_categories!products_category_id_fkey ( id, name, slug ),
  supplier:companies!products_supplier_company_id_fkey ( id, name )
`;

function toRecord(row: Row): ProductRecord {
  return {
    id: row.id,
    supplierCompanyId: row.supplier_company_id,
    supplierName: row.supplier?.name ?? null,
    name: row.name,
    sku: row.sku,
    description: row.description,
    originCountry: row.origin_country,
    unit: row.unit,
    priceUsd: Number(row.price_usd),
    moq: Number(row.moq),
    stock: Number(row.stock),
    images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
    active: Boolean(row.active),
    categoryId: row.category_id,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// -----------------------------------------------------------------------------
// Companies owned by the caller (needed for the "post product as company X"
// picker in the create/edit form). Uses the same RLS-safe path as the rest of
// the app — we never leak other users' companies.
// -----------------------------------------------------------------------------
export const listMyCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnedCompany[]> => {
    const { data, error } = await asAny(context.supabase)
      .from("companies")
      .select("id, name, slug, country, verified, owner_id")
      .eq("owner_id", context.userId)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: {
      id: string; name: string; slug: string | null; country: string | null; verified: boolean | null;
    }) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      country: c.country,
      verified: Boolean(c.verified),
    }));
  });

// -----------------------------------------------------------------------------
// Categories (lite list for the form picker + filter). Read is public per RLS.
// -----------------------------------------------------------------------------
export const listProductCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductCategoryLite[]> => {
    const { data, error } = await asAny(context.supabase)
      .from("product_categories")
      .select("id, slug, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProductCategoryLite[];
  });

// -----------------------------------------------------------------------------
// Paginated / filtered / sorted list — supplier's own catalog.
// RLS ensures suppliers see only their own products (or admins see all).
// -----------------------------------------------------------------------------
export const listMyProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listProductsSchema.parse(i))
  .handler(async ({ data, context }): Promise<ProductListPage> => {
    const client = asAny(context.supabase);
    const page = Math.max(1, data.page);
    const pageSize = Math.max(1, Math.min(100, data.pageSize));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Restrict to the caller's owned companies. Combined with RLS this is a
    // belt-and-braces filter — RLS would filter anyway, but this keeps counts
    // accurate and prevents leaking counts of admin-visible rows.
    const { data: myCompanies, error: cErr } = await client
      .from("companies")
      .select("id")
      .eq("owner_id", context.userId);
    if (cErr) throw new Error(cErr.message);
    const myIds = (myCompanies ?? []).map((c: { id: string }) => c.id);
    if (myIds.length === 0) return { items: [], total: 0, page, pageSize };

    const scopedIds = data.companyId
      ? myIds.filter((id) => id === data.companyId)
      : myIds;
    if (scopedIds.length === 0) return { items: [], total: 0, page, pageSize };

    let query = client
      .from("products")
      .select(SELECT, { count: "exact" })
      .in("supplier_company_id", scopedIds);

    if (data.status !== "all") {
      query = query.eq("active", data.status === "active");
    }

    if (data.q) {
      const escaped = data.q.replace(/[%_]/g, "\\$&");
      query = query.or(
        `name.ilike.%${escaped}%,description.ilike.%${escaped}%,sku.ilike.%${escaped}%`,
      );
    }

    if (data.category) {
      const { data: cat, error: catErr } = await client
        .from("product_categories")
        .select("id")
        .eq("slug", data.category)
        .maybeSingle();
      if (catErr) throw new Error(catErr.message);
      if (!cat) return { items: [], total: 0, page, pageSize };
      query = query.eq("category_id", (cat as { id: string }).id);
    }

    switch (data.sort) {
      case "oldest":     query = query.order("created_at", { ascending: true }); break;
      case "name_asc":   query = query.order("name", { ascending: true }); break;
      case "name_desc":  query = query.order("name", { ascending: false }); break;
      case "price_asc":  query = query.order("price_usd", { ascending: true }); break;
      case "price_desc": query = query.order("price_usd", { ascending: false }); break;
      case "stock_asc":  query = query.order("stock", { ascending: true }); break;
      case "stock_desc": query = query.order("stock", { ascending: false }); break;
      case "newest":
      default:           query = query.order("created_at", { ascending: false }); break;
    }
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return {
      items: ((rows ?? []) as unknown as Row[]).map(toRecord),
      total: count ?? 0,
      page,
      pageSize,
    };
  });

// -----------------------------------------------------------------------------
// Single product — RLS: owner + admin only if inactive, everyone if active.
// -----------------------------------------------------------------------------
export const getMyProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => productIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<ProductRecord | null> => {
    const { data: row, error } = await asAny(context.supabase)
      .from("products")
      .select(SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toRecord(row as unknown as Row);
  });

// -----------------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------------
export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createProductSchema.parse(i))
  .handler(async ({ data, context }): Promise<ProductRecord> => {
    const client = asAny(context.supabase);

    // Confirm the caller actually owns the target company. This is a friendlier
    // error than letting RLS reject the insert.
    const { data: co, error: cErr } = await client
      .from("companies")
      .select("id, owner_id")
      .eq("id", data.companyId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!co || (co as { owner_id: string }).owner_id !== context.userId) {
      throw new Error("You don't own this company");
    }

    const payload = {
      supplier_company_id: data.companyId,
      name: data.name,
      sku: data.sku ? data.sku : null,
      description: data.description ? data.description : null,
      category_id: data.categoryId ? data.categoryId : null,
      origin_country: data.originCountry ? data.originCountry : null,
      unit: data.unit,
      price_usd: data.priceUsd,
      moq: data.moq,
      stock: data.stock,
      images: data.images,
      active: data.active,
    };

    const { data: row, error } = await client
      .from("products")
      .insert(payload)
      .select(SELECT)
      .single();
    if (error) {
      // Humanize the most common conflict — supplier + SKU is unique.
      if (/products_supplier_company_id_sku_key/i.test(error.message)) {
        throw new Error("products.error.skuExists");
      }
      throw new Error(error.message);
    }
    return toRecord(row as unknown as Row);
  });

// -----------------------------------------------------------------------------
// Update — RLS enforces ownership; we send only whitelisted columns.
// -----------------------------------------------------------------------------
export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateProductSchema.parse(i))
  .handler(async ({ data, context }): Promise<ProductRecord> => {
    const client = asAny(context.supabase);

    // Prevent silently moving a product between companies the caller does not
    // own. RLS covers the destination row; this checks the source row too.
    const { data: existing, error: exErr } = await client
      .from("products")
      .select("id, supplier_company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Product not found");

    if ((existing as { supplier_company_id: string }).supplier_company_id !== data.companyId) {
      const { data: co, error: cErr } = await client
        .from("companies")
        .select("owner_id")
        .eq("id", data.companyId)
        .maybeSingle();
      if (cErr) throw new Error(cErr.message);
      if (!co || (co as { owner_id: string }).owner_id !== context.userId) {
        throw new Error("You don't own the target company");
      }
    }

    const patch = {
      supplier_company_id: data.companyId,
      name: data.name,
      sku: data.sku ? data.sku : null,
      description: data.description ? data.description : null,
      category_id: data.categoryId ? data.categoryId : null,
      origin_country: data.originCountry ? data.originCountry : null,
      unit: data.unit,
      price_usd: data.priceUsd,
      moq: data.moq,
      stock: data.stock,
      images: data.images,
      active: data.active,
    };

    const { data: row, error } = await client
      .from("products")
      .update(patch)
      .eq("id", data.id)
      .select(SELECT)
      .single();
    if (error) {
      if (/products_supplier_company_id_sku_key/i.test(error.message)) {
        throw new Error("products.error.skuExists");
      }
      throw new Error(error.message);
    }
    return toRecord(row as unknown as Row);
  });

// -----------------------------------------------------------------------------
// Toggle active/inactive — cheaper than a full update; used by the row action.
// -----------------------------------------------------------------------------
export const setProductActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => setActiveSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ id: string; active: boolean }> => {
    const { data: row, error } = await asAny(context.supabase)
      .from("products")
      .update({ active: data.active })
      .eq("id", data.id)
      .select("id, active")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string; active: boolean };
  });

// -----------------------------------------------------------------------------
// Delete — RLS enforces ownership. FKs cascade for owned children.
// -----------------------------------------------------------------------------
export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => productIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await asAny(context.supabase)
      .from("products")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
