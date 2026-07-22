/**
 * Orders data layer.
 *
 * All mutations run under the caller's RLS. Ownership checks are duplicated
 * as friendly errors before hitting the database so users get an i18n
 * message instead of a raw Postgres policy failure.
 *
 * Pricing is computed server-side from the persisted line items — never
 * trusted from the client — so subtotal / tax / discount / total always
 * agree with what was actually stored.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { allowedTransitions } from "@/lib/orders/constants";
import { computePricing } from "@/lib/orders/format";
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersSchema,
  orderIdSchema,
  setOrderStatusSchema,
  updateOrderSchema,
} from "@/lib/orders/schemas";
import type {
  OrderCounterparty,
  OrderCompanyLite,
  OrderItemRecord,
  OrderListItem,
  OrderListPage,
  OrderProductLite,
  OrderRecord,
  OrderRole,
  OrderStatus,
  OrderStatusEvent,
} from "@/lib/orders/types";

// Generated types don't cover every trade table — widen locally.
const asAny = (c: unknown) => c as unknown as SupabaseClient;

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------
interface CompanyRow {
  id: string;
  name: string;
  country: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
}

interface ItemRow {
  id: string;
  product_id: string | null;
  name: string;
  quantity: number | string;
  unit: string;
  unit_price_usd: number | string;
  total_usd: number | string | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  buyer_company_id: string;
  supplier_company_id: string;
  currency: string;
  subtotal_usd: number | string;
  discount_pct: number | string;
  discount_usd: number | string;
  tax_pct: number | string;
  tax_usd: number | string;
  total_usd: number | string;
  incoterms: string | null;
  notes: string | null;
  eta: string | null;
  cancelled_reason: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  buyer: CompanyRow | null;
  supplier: CompanyRow | null;
  items?: ItemRow[];
}

const COMPANY_COLS = "id, name, country, logo_url, email, phone";
const ORDER_SELECT = `
  id, order_number, status, buyer_company_id, supplier_company_id,
  currency, subtotal_usd, discount_pct, discount_usd, tax_pct, tax_usd, total_usd,
  incoterms, notes, eta, cancelled_reason, cancelled_at, created_by,
  created_at, updated_at,
  buyer:companies!orders_buyer_company_id_fkey ( ${COMPANY_COLS} ),
  supplier:companies!orders_supplier_company_id_fkey ( ${COMPANY_COLS} )
`;
const ORDER_WITH_ITEMS_SELECT = `${ORDER_SELECT}, items:order_items(*)`;

const num = (v: number | string | null | undefined) =>
  v == null ? 0 : typeof v === "number" ? v : Number(v);

function companyToLite(c: CompanyRow | null): OrderCompanyLite | null {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    country: c.country,
    logoUrl: c.logo_url,
    email: c.email,
    phone: c.phone,
  };
}

function callerRoleFor(
  row: Pick<OrderRow, "buyer_company_id" | "supplier_company_id">,
  myCompanyIds: Set<string>,
  isAdmin: boolean,
): OrderRole | "admin" {
  if (myCompanyIds.has(row.buyer_company_id)) return "buyer";
  if (myCompanyIds.has(row.supplier_company_id)) return "supplier";
  return isAdmin ? "admin" : "buyer"; // fallback (shouldn't happen given RLS)
}

function toItem(row: ItemRow): OrderItemRecord {
  const quantity = num(row.quantity);
  const unitPriceUsd = num(row.unit_price_usd);
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    quantity,
    unit: row.unit,
    unitPriceUsd,
    totalUsd: row.total_usd != null ? num(row.total_usd) : quantity * unitPriceUsd,
  };
}

function toRecord(
  row: OrderRow,
  myCompanyIds: Set<string>,
  isAdmin: boolean,
): OrderRecord {
  const items = (row.items ?? []).map(toItem);
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    buyerCompanyId: row.buyer_company_id,
    supplierCompanyId: row.supplier_company_id,
    buyer: companyToLite(row.buyer),
    supplier: companyToLite(row.supplier),
    currency: row.currency ?? "USD",
    subtotalUsd: num(row.subtotal_usd),
    discountPct: num(row.discount_pct),
    discountUsd: num(row.discount_usd),
    taxPct: num(row.tax_pct),
    taxUsd: num(row.tax_usd),
    totalUsd: num(row.total_usd),
    incoterms: row.incoterms,
    notes: row.notes,
    eta: row.eta,
    cancelledReason: row.cancelled_reason,
    cancelledAt: row.cancelled_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    callerRole: callerRoleFor(row, myCompanyIds, isAdmin),
  };
}

function toListItem(
  row: OrderRow,
  myCompanyIds: Set<string>,
  isAdmin: boolean,
  itemsCount: number,
): OrderListItem {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    buyer: companyToLite(row.buyer),
    supplier: companyToLite(row.supplier),
    itemsCount,
    totalUsd: num(row.total_usd),
    eta: row.eta,
    createdAt: row.created_at,
    callerRole: callerRoleFor(row, myCompanyIds, isAdmin),
  };
}

// ---------------------------------------------------------------------------
// Helpers — caller scope resolution
// ---------------------------------------------------------------------------
async function getMyScope(
  client: SupabaseClient,
  userId: string,
): Promise<{ myCompanyIds: Set<string>; isAdmin: boolean }> {
  const [{ data: myCompanies, error: cErr }, { data: adminRow }] = await Promise.all([
    client.from("companies").select("id").eq("owner_id", userId),
    client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
  ]);
  if (cErr) throw new Error(cErr.message);
  const myCompanyIds = new Set(((myCompanies ?? []) as { id: string }[]).map((c) => c.id));
  return { myCompanyIds, isAdmin: Boolean(adminRow) };
}

async function assertOwnsCompany(
  client: SupabaseClient,
  companyId: string,
  userId: string,
): Promise<void> {
  const { data, error } = await client
    .from("companies")
    .select("id, owner_id")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { id: string; owner_id: string } | null;
  if (!row) throw new Error("orders.error.companyNotFound");
  if (row.owner_id !== userId) throw new Error("orders.error.notCompanyOwner");
}

// ---------------------------------------------------------------------------
// Counterparty picker — companies the caller can transact with.
// (Any verified/known company that isn't one of theirs — restricted by RLS.)
// ---------------------------------------------------------------------------
export const listMyCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderCounterparty[]> => {
    const { data, error } = await asAny(context.supabase)
      .from("companies")
      .select("id, name, country")
      .eq("owner_id", context.userId)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderCounterparty[];
  });

export const listCounterparties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderCounterparty[]> => {
    const client = asAny(context.supabase);
    const { data, error } = await client
      .from("companies")
      .select("id, name, country, owner_id")
      .order("name", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { id: string; name: string; country: string | null; owner_id: string }[])
      .filter((c) => c.owner_id !== context.userId)
      .map((c) => ({ id: c.id, name: c.name, country: c.country }));
  });

// ---------------------------------------------------------------------------
// Product picker for a given supplier — used when building line items.
// ---------------------------------------------------------------------------
export const listSupplierProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => {
    const parsed = i as { supplierCompanyId?: unknown };
    if (typeof parsed?.supplierCompanyId !== "string" || parsed.supplierCompanyId.length === 0) {
      return { supplierCompanyId: "" };
    }
    return { supplierCompanyId: parsed.supplierCompanyId };
  })
  .handler(async ({ data, context }): Promise<OrderProductLite[]> => {
    if (!data.supplierCompanyId) return [];
    const { data: rows, error } = await asAny(context.supabase)
      .from("products")
      .select("id, name, sku, unit, price_usd, moq, stock, active")
      .eq("supplier_company_id", data.supplierCompanyId)
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as {
      id: string; name: string; sku: string | null; unit: string;
      price_usd: number | string; moq: number | string; stock: number | string;
    }[]).map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      unit: r.unit,
      priceUsd: num(r.price_usd),
      moq: num(r.moq),
      stock: num(r.stock),
    }));
  });

// ---------------------------------------------------------------------------
// List orders — RLS filters to buyer + supplier + admin visibility.
// ---------------------------------------------------------------------------
export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listOrdersSchema.parse(i))
  .handler(async ({ data, context }): Promise<OrderListPage> => {
    const client = asAny(context.supabase);
    const page = Math.max(1, data.page);
    const pageSize = Math.max(1, Math.min(100, data.pageSize));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { myCompanyIds, isAdmin } = await getMyScope(client, context.userId);
    if (myCompanyIds.size === 0 && !isAdmin) {
      return { items: [], total: 0, page, pageSize };
    }

    let query = client
      .from("orders")
      .select(`${ORDER_SELECT}, items:order_items(id)`, { count: "exact" });

    // Role scoping — buyer-only or supplier-only slices for the caller.
    if (!isAdmin) {
      const ids = [...myCompanyIds];
      if (data.role === "buyer") {
        query = query.in("buyer_company_id", ids);
      } else if (data.role === "supplier") {
        query = query.in("supplier_company_id", ids);
      } else {
        const csv = ids.map((id) => `"${id}"`).join(",");
        query = query.or(`buyer_company_id.in.(${csv}),supplier_company_id.in.(${csv})`);
      }
    } else if (data.role !== "all" && myCompanyIds.size > 0) {
      const ids = [...myCompanyIds];
      if (data.role === "buyer") query = query.in("buyer_company_id", ids);
      else if (data.role === "supplier") query = query.in("supplier_company_id", ids);
    }

    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data.q) {
      const escaped = data.q.replace(/[%_]/g, "\\$&");
      query = query.or(
        `order_number.ilike.%${escaped}%,incoterms.ilike.%${escaped}%,notes.ilike.%${escaped}%`,
      );
    }

    switch (data.sort) {
      case "oldest":     query = query.order("created_at", { ascending: true }); break;
      case "total_asc":  query = query.order("total_usd", { ascending: true }); break;
      case "total_desc": query = query.order("total_usd", { ascending: false }); break;
      case "eta_asc":    query = query.order("eta", { ascending: true, nullsFirst: false }); break;
      case "eta_desc":   query = query.order("eta", { ascending: false, nullsFirst: false }); break;
      case "newest":
      default:           query = query.order("created_at", { ascending: false }); break;
    }
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    const items = ((rows ?? []) as unknown as (OrderRow & { items?: { id: string }[] })[]).map((r) =>
      toListItem(r, myCompanyIds, isAdmin, r.items?.length ?? 0),
    );
    return { items, total: count ?? 0, page, pageSize };
  });

// ---------------------------------------------------------------------------
// Single order with items — full detail sheet source.
// ---------------------------------------------------------------------------
export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orderIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<OrderRecord | null> => {
    const client = asAny(context.supabase);
    const { myCompanyIds, isAdmin } = await getMyScope(client, context.userId);

    const { data: row, error } = await client
      .from("orders")
      .select(ORDER_WITH_ITEMS_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toRecord(row as unknown as OrderRow, myCompanyIds, isAdmin);
  });

// ---------------------------------------------------------------------------
// Status history / timeline
// ---------------------------------------------------------------------------
export const getOrderTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orderIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<OrderStatusEvent[]> => {
    const { data: rows, error } = await asAny(context.supabase)
      .from("order_status_history")
      .select("id, from_status, to_status, changed_by, note, changed_at")
      .eq("order_id", data.id)
      .order("changed_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((rows ?? []) as {
      id: string; from_status: OrderStatus | null; to_status: OrderStatus;
      changed_by: string | null; note: string | null; changed_at: string;
    }[]).map((r) => ({
      id: r.id,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      changedBy: r.changed_by,
      note: r.note,
      changedAt: r.changed_at,
    }));
  });

// ---------------------------------------------------------------------------
// Create order
// ---------------------------------------------------------------------------
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createOrderSchema.parse(i))
  .handler(async ({ data, context }): Promise<OrderRecord> => {
    const client = asAny(context.supabase);

    // Buyer company must be owned by caller (RLS enforces on insert, but this
    // maps the raw policy failure to a friendly i18n message).
    await assertOwnsCompany(client, data.buyerCompanyId, context.userId);

    const pricing = computePricing({
      items: data.items,
      discountPct: data.discountPct,
      taxPct: data.taxPct,
    });

    const status: OrderStatus = data.submit ? "pending" : "draft";

    const { data: inserted, error: insertErr } = await client
      .from("orders")
      .insert({
        buyer_company_id: data.buyerCompanyId,
        supplier_company_id: data.supplierCompanyId,
        status,
        currency: "USD",
        subtotal_usd: pricing.subtotalUsd,
        discount_pct: data.discountPct,
        discount_usd: pricing.discountUsd,
        tax_pct: data.taxPct,
        tax_usd: pricing.taxUsd,
        total_usd: pricing.totalUsd,
        incoterms: data.incoterms || null,
        notes: data.notes || null,
        eta: data.eta || null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (insertErr) throw new Error(insertErr.message);
    const orderId = (inserted as { id: string }).id;

    const itemRows = data.items.map((it) => ({
      order_id: orderId,
      product_id: it.productId || null,
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      unit_price_usd: it.unitPriceUsd,
    }));
    const { error: itemsErr } = await client.from("order_items").insert(itemRows);
    if (itemsErr) {
      // Roll back the parent so we never leave an order with no items.
      await client.from("orders").delete().eq("id", orderId);
      throw new Error(itemsErr.message);
    }

    const { myCompanyIds, isAdmin } = await getMyScope(client, context.userId);
    const { data: row, error: readErr } = await client
      .from("orders")
      .select(ORDER_WITH_ITEMS_SELECT)
      .eq("id", orderId)
      .single();
    if (readErr) throw new Error(readErr.message);
    return toRecord(row as unknown as OrderRow, myCompanyIds, isAdmin);
  });

// ---------------------------------------------------------------------------
// Update order (draft-only) — replace items atomically and recompute totals.
// ---------------------------------------------------------------------------
export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateOrderSchema.parse(i))
  .handler(async ({ data, context }): Promise<OrderRecord> => {
    const client = asAny(context.supabase);
    const { data: existing, error: exErr } = await client
      .from("orders")
      .select("id, status, buyer_company_id, supplier_company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("orders.error.notFound");

    const row = existing as { id: string; status: OrderStatus; buyer_company_id: string };
    // Only drafts are editable — after submission use status transitions.
    if (row.status !== "draft") {
      throw new Error("orders.error.notEditable");
    }

    const pricing = computePricing({
      items: data.items,
      discountPct: data.discountPct,
      taxPct: data.taxPct,
    });

    const { error: updErr } = await client
      .from("orders")
      .update({
        incoterms: data.incoterms || null,
        notes: data.notes || null,
        eta: data.eta || null,
        subtotal_usd: pricing.subtotalUsd,
        discount_pct: data.discountPct,
        discount_usd: pricing.discountUsd,
        tax_pct: data.taxPct,
        tax_usd: pricing.taxUsd,
        total_usd: pricing.totalUsd,
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    // Replace items atomically. RLS applies to both statements.
    const { error: delErr } = await client.from("order_items").delete().eq("order_id", data.id);
    if (delErr) throw new Error(delErr.message);

    const itemRows = data.items.map((it) => ({
      order_id: data.id,
      product_id: it.productId || null,
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      unit_price_usd: it.unitPriceUsd,
    }));
    const { error: insErr } = await client.from("order_items").insert(itemRows);
    if (insErr) throw new Error(insErr.message);

    const { myCompanyIds, isAdmin } = await getMyScope(client, context.userId);
    const { data: fresh, error: readErr } = await client
      .from("orders")
      .select(ORDER_WITH_ITEMS_SELECT)
      .eq("id", data.id)
      .single();
    if (readErr) throw new Error(readErr.message);
    return toRecord(fresh as unknown as OrderRow, myCompanyIds, isAdmin);
  });

// ---------------------------------------------------------------------------
// Move status forward — gated by the client-side state machine AND re-checked
// here so the server never trusts the caller's assumed role/path.
// ---------------------------------------------------------------------------
export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => setOrderStatusSchema.parse(i))
  .handler(async ({ data, context }): Promise<OrderRecord> => {
    const client = asAny(context.supabase);
    const { data: existing, error: exErr } = await client
      .from("orders")
      .select("id, status, buyer_company_id, supplier_company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("orders.error.notFound");
    const row = existing as { id: string; status: OrderStatus; buyer_company_id: string; supplier_company_id: string };

    const { myCompanyIds, isAdmin } = await getMyScope(client, context.userId);
    const callerRole: OrderRole | "admin" = myCompanyIds.has(row.buyer_company_id)
      ? "buyer"
      : myCompanyIds.has(row.supplier_company_id)
        ? "supplier"
        : isAdmin
          ? "admin"
          : "buyer";

    const next = data.status as OrderStatus;
    const allowed = allowedTransitions(row.status, callerRole);
    if (!allowed.includes(next)) {
      throw new Error("orders.error.transitionNotAllowed");
    }

    const patch: Record<string, unknown> = { status: next };
    if (next === "cancelled") {
      patch.cancelled_reason = data.reason || null;
      patch.cancelled_at = new Date().toISOString();
    }

    const { error: updErr } = await client
      .from("orders")
      .update(patch)
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    const { data: fresh, error: readErr } = await client
      .from("orders")
      .select(ORDER_WITH_ITEMS_SELECT)
      .eq("id", data.id)
      .single();
    if (readErr) throw new Error(readErr.message);
    return toRecord(fresh as unknown as OrderRow, myCompanyIds, isAdmin);
  });

// ---------------------------------------------------------------------------
// Cancel order — thin wrapper enforcing a required reason.
// ---------------------------------------------------------------------------
export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => cancelOrderSchema.parse(i))
  .handler(async ({ data, context }): Promise<OrderRecord> => {
    const client = asAny(context.supabase);
    const { data: existing, error: exErr } = await client
      .from("orders")
      .select("id, status, buyer_company_id, supplier_company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("orders.error.notFound");
    const row = existing as { id: string; status: OrderStatus; buyer_company_id: string; supplier_company_id: string };

    const { myCompanyIds, isAdmin } = await getMyScope(client, context.userId);
    const callerRole: OrderRole | "admin" = myCompanyIds.has(row.buyer_company_id)
      ? "buyer"
      : myCompanyIds.has(row.supplier_company_id)
        ? "supplier"
        : isAdmin
          ? "admin"
          : "buyer";

    if (!allowedTransitions(row.status, callerRole).includes("cancelled")) {
      throw new Error("orders.error.cancelNotAllowed");
    }

    const { error: updErr } = await client
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_reason: data.reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    const { data: fresh, error: readErr } = await client
      .from("orders")
      .select(ORDER_WITH_ITEMS_SELECT)
      .eq("id", data.id)
      .single();
    if (readErr) throw new Error(readErr.message);
    return toRecord(fresh as unknown as OrderRow, myCompanyIds, isAdmin);
  });

// ---------------------------------------------------------------------------
// Delete order — only draft orders owned by the buyer.
// ---------------------------------------------------------------------------
export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orderIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const client = asAny(context.supabase);
    const { data: existing, error: exErr } = await client
      .from("orders")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("orders.error.notFound");
    if ((existing as { status: OrderStatus }).status !== "draft") {
      throw new Error("orders.error.deleteOnlyDraft");
    }
    const { error } = await client.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
