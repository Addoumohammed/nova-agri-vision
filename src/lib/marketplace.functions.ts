/**
 * Marketplace data layer.
 *
 * The only module in the marketplace stack that talks to Supabase. Returns
 * typed DTOs (see src/lib/marketplace/types.ts) — the UI and hooks never see
 * raw PostgREST rows.
 *
 * All product/supplier reads run under the caller's RLS. Product visibility
 * is enforced by the `products read active` policy; supplier lookups by the
 * `companies read all auth` policy; RFQ writes by `Buyer inserts own RFQ`;
 * messaging by the thread membership policies.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  contactSupplierSchema,
  listMarketplaceSchema,
  productIdSchema,
  requestQuoteSchema,
} from "@/lib/marketplace/schemas";
import type {
  MarketplaceCategory,
  MarketplaceListPage,
  MarketplaceProduct,
} from "@/lib/marketplace/types";

// The generated Database types don't yet include every trade table; the
// runtime PostgREST shapes match our schema, so we widen inside this file.
const asAny = (c: unknown) => c as unknown as SupabaseClient;

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  origin_country: string | null;
  unit: string;
  price_usd: number | string;
  moq: number | string;
  stock: number | string;
  images: string[] | null;
  category_id: string | null;
  created_at: string;
  category: { id: string; name: string; slug: string } | null;
  supplier: {
    id: string;
    name: string;
    slug: string | null;
    country: string | null;
    city: string | null;
    verified: boolean;
    rating: number | string;
    owner_id: string;
  } | null;
  certs: Array<{
    id: string;
    cert_type: string;
    issuer: string | null;
    verified: boolean;
    expiry_date: string | null;
  }> | null;
}

const PRODUCT_SELECT = `
  id, name, sku, description, origin_country, unit, price_usd, moq, stock, images,
  category_id, created_at,
  category:product_categories!products_category_id_fkey ( id, name, slug ),
  supplier:companies!products_supplier_company_id_fkey ( id, name, slug, country, city, verified, rating, owner_id ),
  certs:product_certifications ( id, cert_type, issuer, verified, expiry_date )
`;

function toProduct(row: ProductRow): MarketplaceProduct {
  const supplier = row.supplier;
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    originCountry: row.origin_country,
    unit: row.unit,
    priceUsd: Number(row.price_usd),
    moq: Number(row.moq),
    stock: Number(row.stock),
    images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
    categoryId: row.category_id,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    supplier: supplier
      ? {
          id: supplier.id,
          name: supplier.name,
          slug: supplier.slug,
          country: supplier.country,
          city: supplier.city,
          verified: Boolean(supplier.verified),
          rating: Number(supplier.rating),
        }
      : { id: "", name: "Unknown supplier", slug: null, country: null, city: null, verified: false, rating: 0 },
    certifications: (row.certs ?? []).map((c) => ({
      id: c.id,
      certType: c.cert_type,
      issuer: c.issuer,
      verified: Boolean(c.verified),
      expiresAt: c.expiry_date,
    })),
    createdAt: row.created_at,
  };
}

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

export const listMarketplaceCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MarketplaceCategory[]> => {
    const client = asAny(context.supabase);
    const [{ data: cats, error: catErr }, { data: counts, error: cntErr }] = await Promise.all([
      client.from("product_categories").select("id, slug, name, icon").order("name", { ascending: true }),
      // Count active products per category. RLS filters unauthorized rows automatically.
      client.from("products").select("category_id").eq("active", true).limit(2000),
    ]);
    if (catErr) throw new Error(catErr.message);
    if (cntErr) throw new Error(cntErr.message);

    const countByCat = new Map<string, number>();
    for (const row of (counts ?? []) as Array<{ category_id: string | null }>) {
      if (!row.category_id) continue;
      countByCat.set(row.category_id, (countByCat.get(row.category_id) ?? 0) + 1);
    }
    return ((cats ?? []) as Array<{ id: string; slug: string; name: string; icon: string | null }>).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      productCount: countByCat.get(c.id) ?? 0,
    }));
  });

// -----------------------------------------------------------------------------
// Products list (search + filter + sort + paginate — all server-side)
// -----------------------------------------------------------------------------

export const listMarketplaceProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listMarketplaceSchema.parse(i))
  .handler(async ({ data, context }): Promise<MarketplaceListPage> => {
    const client = asAny(context.supabase);
    const page = Math.max(1, data.page);
    const pageSize = Math.max(1, Math.min(60, data.pageSize));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .eq("active", true);

    if (data.q) {
      // Use ilike on name + description; DB has an ILIKE-friendly index via pg_trgm.
      const escaped = data.q.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%,sku.ilike.%${escaped}%`);
    }
    if (data.country) query = query.eq("origin_country", data.country.toUpperCase());

    if (data.category) {
      // Resolve slug → id (single round-trip). Missing slug yields empty page.
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
      case "price_asc":  query = query.order("price_usd", { ascending: true }); break;
      case "price_desc": query = query.order("price_usd", { ascending: false }); break;
      case "stock":      query = query.order("stock", { ascending: false }); break;
      case "newest":
      case "relevance":
      default:           query = query.order("created_at", { ascending: false }); break;
    }
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return {
      items: ((rows ?? []) as unknown as ProductRow[]).map(toProduct),
      total: count ?? 0,
      page,
      pageSize,
    };
  });

// -----------------------------------------------------------------------------
// Single product
// -----------------------------------------------------------------------------

export const getMarketplaceProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => productIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<MarketplaceProduct | null> => {
    const { data: row, error } = await asAny(context.supabase)
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", data.id)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toProduct(row as unknown as ProductRow);
  });

// -----------------------------------------------------------------------------
// Request a quote from a marketplace product → creates a real RFQ
// -----------------------------------------------------------------------------

export const requestQuoteFromProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => requestQuoteSchema.parse(i))
  .handler(async ({ data, context }) => {
    const client = asAny(context.supabase);

    const { data: product, error: prodErr } = await client
      .from("products")
      .select("id, name, unit, price_usd, category:product_categories!products_category_id_fkey(name)")
      .eq("id", data.productId)
      .eq("active", true)
      .maybeSingle();
    if (prodErr) throw new Error(prodErr.message);
    if (!product) throw new Error("Product not available");

    const p = product as unknown as {
      name: string;
      unit: string;
      price_usd: number | string;
      category: { name: string } | null;
    };
    const payload = {
      buyer_id: context.userId,
      title: `Quote request: ${p.name}`,
      description: data.message ?? null,
      product_name: p.name,
      product_category: p.category?.name ?? null,
      quantity: data.quantity,
      unit: data.unit ?? p.unit,
      target_price: data.targetPrice ?? null,
      currency: "USD",
      incoterm: data.incoterm,
      destination_country: data.destinationCountry ?? null,
      destination_port: data.destinationPort ?? null,
      required_certifications: [],
      deadline: data.deadline || null,
      status: "open" as const,
    };
    const { data: rfq, error: insErr } = await client
      .from("rfqs")
      .insert(payload)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { rfqId: (rfq as { id: string }).id };
  });

// -----------------------------------------------------------------------------
// Contact supplier → creates a message thread + first message
// -----------------------------------------------------------------------------

export const contactSupplierAboutProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => contactSupplierSchema.parse(i))
  .handler(async ({ data, context }) => {
    const client = asAny(context.supabase);

    const { data: product, error: prodErr } = await client
      .from("products")
      .select("id, name, supplier:companies!products_supplier_company_id_fkey(id, owner_id, name)")
      .eq("id", data.productId)
      .eq("active", true)
      .maybeSingle();
    if (prodErr) throw new Error(prodErr.message);
    if (!product) throw new Error("Product not available");

    const supplier = (product as unknown as {
      supplier: { id: string; owner_id: string; name: string } | null;
    }).supplier;
    if (!supplier?.owner_id) throw new Error("Supplier is not reachable");
    if (supplier.owner_id === context.userId) {
      throw new Error("You cannot message your own product");
    }

    // 1. Create the thread as the caller
    const { data: thread, error: thrErr } = await client
      .from("message_threads")
      .insert({ subject: data.subject, created_by: context.userId })
      .select("id")
      .single();
    if (thrErr) throw new Error(thrErr.message);
    const threadId = (thread as { id: string }).id;

    // 2. Add both participants (buyer + supplier owner). Duplicates guarded
    //    by unique (thread_id, user_id) — we ignore conflicts if any.
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

    // 3. Post the opening message. RLS passes because the caller is now a member.
    const { error: msgErr } = await client.from("messages").insert({
      thread_id: threadId,
      sender_id: context.userId,
      body: data.body,
    });
    if (msgErr) throw new Error(msgErr.message);

    return { threadId };
  });
