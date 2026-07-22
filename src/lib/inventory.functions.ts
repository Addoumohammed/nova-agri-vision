/**
 * Inventory data layer (warehouses + stock rows + movements).
 *
 * Only module that talks to Supabase for inventory mutations. Every write
 * runs under the caller's RLS — the warehouse policies scope operations to
 * companies owned by the caller (or admins). We never bypass that.
 *
 * Returns typed DTOs — the UI never sees raw PostgREST rows.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  adjustStockSchema,
  barcodeLookupSchema,
  inventoryIdSchema,
  listInventorySchema,
  listMovementsSchema,
  transferStockSchema,
  upsertInventorySchema,
  warehouseSchema,
} from "@/lib/inventory/schemas";
import { computeAvailable, computeStatus } from "@/lib/inventory/format";
import type {
  InventoryListPage,
  InventoryRecord,
  InventoryStats,
  ProductLite,
  StockMovementRecord,
  WarehouseRecord,
} from "@/lib/inventory/types";

// Generated types don't yet include every trade table; runtime PostgREST
// shapes match the schema, so we widen inside this file.
const asAny = (c: unknown) => c as unknown as SupabaseClient;

// --------------------------------------------------------------------------
// Ownership resolution — the caller's owned company IDs (belt-and-braces
// alongside RLS so counts don't leak admin-visible rows).
// --------------------------------------------------------------------------
async function myCompanyIds(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await client
    .from("companies")
    .select("id")
    .eq("owner_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c: { id: string }) => c.id);
}

// --------------------------------------------------------------------------
// Warehouses
// --------------------------------------------------------------------------
interface WarehouseRow {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  country: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  capacity_mt: number | string | null;
  created_at: string;
  updated_at: string;
  company: { id: string; name: string } | null;
}

const WAREHOUSE_SELECT = `
  id, company_id, name, address, country, city, latitude, longitude, capacity_mt,
  created_at, updated_at,
  company:companies!warehouses_company_id_fkey ( id, name )
`;

function toWarehouseRecord(row: WarehouseRow, itemsCount = 0, totalQuantity = 0): WarehouseRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company?.name ?? null,
    name: row.name,
    address: row.address,
    country: row.country,
    city: row.city,
    capacityMt: row.capacity_mt != null ? Number(row.capacity_mt) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    itemsCount,
    totalQuantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const listMyWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WarehouseRecord[]> => {
    const client = asAny(context.supabase);
    const ids = await myCompanyIds(client, context.userId);
    if (ids.length === 0) return [];

    const { data, error } = await client
      .from("warehouses")
      .select(WAREHOUSE_SELECT)
      .in("company_id", ids)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    const warehouses = (data ?? []) as unknown as WarehouseRow[];
    if (warehouses.length === 0) return [];

    // Aggregate item count + total quantity per warehouse in a single query.
    const { data: invRows, error: iErr } = await client
      .from("inventory")
      .select("warehouse_id, quantity")
      .in("warehouse_id", warehouses.map((w) => w.id));
    if (iErr) throw new Error(iErr.message);

    const agg = new Map<string, { count: number; qty: number }>();
    for (const r of (invRows ?? []) as { warehouse_id: string; quantity: number | string }[]) {
      const cur = agg.get(r.warehouse_id) ?? { count: 0, qty: 0 };
      cur.count += 1;
      cur.qty += Number(r.quantity) || 0;
      agg.set(r.warehouse_id, cur);
    }
    return warehouses.map((w) => {
      const a = agg.get(w.id);
      return toWarehouseRecord(w, a?.count ?? 0, a?.qty ?? 0);
    });
  });

export const upsertWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => warehouseSchema.parse(i))
  .handler(async ({ data, context }): Promise<WarehouseRecord> => {
    const client = asAny(context.supabase);

    // Verify the caller owns the target company (friendlier than RLS reject).
    const { data: co, error: cErr } = await client
      .from("companies")
      .select("id, owner_id")
      .eq("id", data.companyId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!co || (co as { owner_id: string }).owner_id !== context.userId) {
      throw new Error("inventory.error.notOwner");
    }

    const payload = {
      company_id: data.companyId,
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      country: data.country || null,
      capacity_mt: data.capacityMt ?? null,
    };

    const q = data.id
      ? client.from("warehouses").update(payload).eq("id", data.id).select(WAREHOUSE_SELECT).single()
      : client.from("warehouses").insert(payload).select(WAREHOUSE_SELECT).single();

    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return toWarehouseRecord(row as unknown as WarehouseRow);
  });

export const deleteWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => inventoryIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const client = asAny(context.supabase);
    const { count, error: cErr } = await client
      .from("inventory")
      .select("id", { count: "exact", head: true })
      .eq("warehouse_id", data.id);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) throw new Error("inventory.error.warehouseNotEmpty");
    const { error } = await client.from("warehouses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

// --------------------------------------------------------------------------
// Product picker + barcode lookup (scoped to caller's companies)
// --------------------------------------------------------------------------
export const listMyProductsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductLite[]> => {
    const client = asAny(context.supabase);
    const ids = await myCompanyIds(client, context.userId);
    if (ids.length === 0) return [];
    const { data, error } = await client
      .from("products")
      .select("id, supplier_company_id, name, sku, barcode, unit")
      .in("supplier_company_id", ids)
      .order("name", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: {
      id: string; supplier_company_id: string; name: string;
      sku: string | null; barcode: string | null; unit: string;
    }) => ({
      id: p.id,
      supplierCompanyId: p.supplier_company_id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
    }));
  });

export const lookupProductByBarcode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => barcodeLookupSchema.parse(i))
  .handler(async ({ data, context }): Promise<ProductLite | null> => {
    const client = asAny(context.supabase);
    const ids = await myCompanyIds(client, context.userId);
    if (ids.length === 0) return null;
    const { data: row, error } = await client
      .from("products")
      .select("id, supplier_company_id, name, sku, barcode, unit")
      .in("supplier_company_id", ids)
      .eq("barcode", data.barcode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const p = row as {
      id: string; supplier_company_id: string; name: string;
      sku: string | null; barcode: string | null; unit: string;
    };
    return {
      id: p.id,
      supplierCompanyId: p.supplier_company_id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
    };
  });

// --------------------------------------------------------------------------
// Inventory rows
// --------------------------------------------------------------------------
interface InventoryRow {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number | string;
  reserved: number | string;
  unit: string;
  low_stock_threshold: number | string;
  updated_at: string;
  warehouse: { id: string; name: string; company_id: string } | null;
  product: { id: string; name: string; sku: string | null; barcode: string | null; unit: string } | null;
}

const INVENTORY_SELECT = `
  id, warehouse_id, product_id, quantity, reserved, unit, low_stock_threshold, updated_at,
  warehouse:warehouses!inventory_warehouse_id_fkey ( id, name, company_id ),
  product:products!inventory_product_id_fkey ( id, name, sku, barcode, unit )
`;

function toInventoryRecord(row: InventoryRow): InventoryRecord {
  const qty = Number(row.quantity) || 0;
  const reserved = Number(row.reserved) || 0;
  const threshold = Number(row.low_stock_threshold) || 0;
  return {
    id: row.id,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse?.name ?? "—",
    companyId: row.warehouse?.company_id ?? "",
    productId: row.product_id,
    productName: row.product?.name ?? "—",
    productSku: row.product?.sku ?? null,
    productBarcode: row.product?.barcode ?? null,
    unit: row.unit || row.product?.unit || "MT",
    quantity: qty,
    reserved,
    available: computeAvailable(qty, reserved),
    lowStockThreshold: threshold,
    status: computeStatus(qty, reserved, threshold),
    updatedAt: row.updated_at,
  };
}

export const listInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listInventorySchema.parse(i))
  .handler(async ({ data, context }): Promise<InventoryListPage> => {
    const client = asAny(context.supabase);
    const page = Math.max(1, data.page);
    const pageSize = Math.max(1, Math.min(100, data.pageSize));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Scope to caller's warehouses.
    const myIds = await myCompanyIds(client, context.userId);
    if (myIds.length === 0) return { items: [], total: 0, page, pageSize };
    const { data: whs, error: wErr } = await client
      .from("warehouses").select("id").in("company_id", myIds);
    if (wErr) throw new Error(wErr.message);
    const whIds = (whs ?? []).map((w: { id: string }) => w.id);
    if (whIds.length === 0) return { items: [], total: 0, page, pageSize };

    const scopedWh = data.warehouseId
      ? whIds.filter((id) => id === data.warehouseId)
      : whIds;
    if (scopedWh.length === 0) return { items: [], total: 0, page, pageSize };

    let query = client
      .from("inventory")
      .select(INVENTORY_SELECT, { count: "exact" })
      .in("warehouse_id", scopedWh);

    if (data.q) {
      // Filter by product name / sku / barcode via a client-side follow-up
      // to keep the query typed. We resolve matching product IDs first.
      const escaped = data.q.replace(/[%_]/g, "\\$&");
      const { data: prods, error: pErr } = await client
        .from("products")
        .select("id")
        .in("supplier_company_id", myIds)
        .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)
        .limit(1000);
      if (pErr) throw new Error(pErr.message);
      const pIds = (prods ?? []).map((p: { id: string }) => p.id);
      if (pIds.length === 0) return { items: [], total: 0, page, pageSize };
      query = query.in("product_id", pIds);
    }

    switch (data.sort) {
      case "oldest":         query = query.order("updated_at", { ascending: true }); break;
      case "quantity_asc":   query = query.order("quantity", { ascending: true }); break;
      case "quantity_desc":  query = query.order("quantity", { ascending: false }); break;
      case "available_asc":  query = query.order("quantity", { ascending: true }); break;
      case "available_desc": query = query.order("quantity", { ascending: false }); break;
      case "product_asc":    query = query.order("product_id", { ascending: true }); break;
      case "product_desc":   query = query.order("product_id", { ascending: false }); break;
      case "newest":
      default:               query = query.order("updated_at", { ascending: false }); break;
    }
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    let items = ((rows ?? []) as unknown as InventoryRow[]).map(toInventoryRecord);

    // Status filter — applied in memory because it's derived.
    if (data.status !== "all") {
      items = items.filter((r) =>
        data.status === "low" ? r.status === "low"
          : data.status === "out" ? r.status === "out"
          : r.status !== "out",
      );
    }

    return { items, total: count ?? 0, page, pageSize };
  });

export const inventoryStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InventoryStats> => {
    const client = asAny(context.supabase);
    const myIds = await myCompanyIds(client, context.userId);
    const empty: InventoryStats = { totalItems: 0, totalQuantity: 0, lowStockCount: 0, outOfStockCount: 0, warehousesCount: 0 };
    if (myIds.length === 0) return empty;
    const { data: whs } = await client.from("warehouses").select("id").in("company_id", myIds);
    const whIds = (whs ?? []).map((w: { id: string }) => w.id);
    if (whIds.length === 0) return empty;
    const { data: rows, error } = await client
      .from("inventory")
      .select("quantity, reserved, low_stock_threshold, warehouse_id")
      .in("warehouse_id", whIds);
    if (error) throw new Error(error.message);
    let totalQty = 0, low = 0, out = 0;
    for (const r of (rows ?? []) as { quantity: number | string; reserved: number | string; low_stock_threshold: number | string }[]) {
      const q = Number(r.quantity) || 0;
      const res = Number(r.reserved) || 0;
      const th = Number(r.low_stock_threshold) || 0;
      totalQty += q;
      const status = computeStatus(q, res, th);
      if (status === "low") low += 1;
      if (status === "out") out += 1;
    }
    return {
      totalItems: rows?.length ?? 0,
      totalQuantity: totalQty,
      lowStockCount: low,
      outOfStockCount: out,
      warehousesCount: whIds.length,
    };
  });

export const upsertInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => upsertInventorySchema.parse(i))
  .handler(async ({ data, context }): Promise<InventoryRecord> => {
    const client = asAny(context.supabase);

    const payload = {
      warehouse_id: data.warehouseId,
      product_id: data.productId,
      unit: data.unit,
      quantity: data.quantity,
      reserved: data.reserved,
      low_stock_threshold: data.lowStockThreshold,
    };

    let previousQty = 0;
    if (data.id) {
      const { data: prev } = await client
        .from("inventory").select("quantity").eq("id", data.id).maybeSingle();
      if (prev) previousQty = Number((prev as { quantity: number | string }).quantity) || 0;
    }

    const q = data.id
      ? client.from("inventory").update(payload).eq("id", data.id).select(INVENTORY_SELECT).single()
      : client.from("inventory").insert(payload).select(INVENTORY_SELECT).single();

    const { data: row, error } = await q;
    if (error) {
      if (/inventory_warehouse_product_key/i.test(error.message)) {
        throw new Error("inventory.error.duplicateRow");
      }
      throw new Error(error.message);
    }
    const rec = toInventoryRecord(row as unknown as InventoryRow);

    // Log a movement if the quantity changed (or a new row was created).
    if (!data.id || previousQty !== rec.quantity) {
      await client.from("stock_movements").insert({
        inventory_id: rec.id,
        warehouse_id: rec.warehouseId,
        product_id: rec.productId,
        movement_type: data.id ? "adjust" : "in",
        quantity: data.id ? rec.quantity - previousQty : rec.quantity,
        previous_qty: previousQty,
        new_qty: rec.quantity,
        unit: rec.unit,
        reason: data.id ? "Manual edit" : "Initial stock",
        performed_by: context.userId,
      });
    }

    return rec;
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => adjustStockSchema.parse(i))
  .handler(async ({ data, context }): Promise<InventoryRecord> => {
    const client = asAny(context.supabase);
    const { data: cur, error: gErr } = await client
      .from("inventory").select(INVENTORY_SELECT).eq("id", data.inventoryId).maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!cur) throw new Error("inventory.error.notFound");
    const existing = cur as unknown as InventoryRow;
    const prev = Number(existing.quantity) || 0;

    let next: number;
    if (data.mode === "in") next = prev + data.quantity;
    else if (data.mode === "out") next = Math.max(0, prev - data.quantity);
    else next = data.quantity; // adjust — absolute set

    if (data.mode === "out" && prev - data.quantity < 0) {
      throw new Error("inventory.error.insufficientStock");
    }

    const { data: row, error } = await client
      .from("inventory")
      .update({ quantity: next })
      .eq("id", data.inventoryId)
      .select(INVENTORY_SELECT).single();
    if (error) throw new Error(error.message);

    await client.from("stock_movements").insert({
      inventory_id: data.inventoryId,
      warehouse_id: existing.warehouse_id,
      product_id: existing.product_id,
      movement_type: data.mode,
      quantity: data.mode === "adjust" ? next - prev : data.quantity,
      previous_qty: prev,
      new_qty: next,
      unit: existing.unit,
      reason: data.reason || null,
      reference: data.reference || null,
      performed_by: context.userId,
    });

    return toInventoryRecord(row as unknown as InventoryRow);
  });

export const transferStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => transferStockSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ source: InventoryRecord; destination: InventoryRecord }> => {
    const client = asAny(context.supabase);
    if (data.inventoryId === data.destinationWarehouseId) {
      throw new Error("inventory.error.transferSame");
    }

    const { data: srcRow, error: sErr } = await client
      .from("inventory").select(INVENTORY_SELECT).eq("id", data.inventoryId).maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!srcRow) throw new Error("inventory.error.notFound");
    const source = srcRow as unknown as InventoryRow;
    const srcPrev = Number(source.quantity) || 0;
    if (srcPrev < data.quantity) throw new Error("inventory.error.insufficientStock");

    if (source.warehouse_id === data.destinationWarehouseId) {
      throw new Error("inventory.error.transferSame");
    }

    // Ownership check on destination warehouse.
    const { data: destWh, error: dwErr } = await client
      .from("warehouses").select("id, company_id").eq("id", data.destinationWarehouseId).maybeSingle();
    if (dwErr) throw new Error(dwErr.message);
    if (!destWh) throw new Error("inventory.error.notOwner");

    const srcNext = srcPrev - data.quantity;

    // Decrement source.
    const { data: srcUpdated, error: uErr } = await client
      .from("inventory")
      .update({ quantity: srcNext })
      .eq("id", data.inventoryId)
      .select(INVENTORY_SELECT).single();
    if (uErr) throw new Error(uErr.message);

    // Find or create destination row for same product.
    const { data: destRow } = await client
      .from("inventory")
      .select(INVENTORY_SELECT)
      .eq("warehouse_id", data.destinationWarehouseId)
      .eq("product_id", source.product_id)
      .maybeSingle();

    let dest: InventoryRow;
    let destPrev = 0;
    if (destRow) {
      dest = destRow as unknown as InventoryRow;
      destPrev = Number(dest.quantity) || 0;
      const { data: destUpdated, error: duErr } = await client
        .from("inventory")
        .update({ quantity: destPrev + data.quantity })
        .eq("id", dest.id)
        .select(INVENTORY_SELECT).single();
      if (duErr) throw new Error(duErr.message);
      dest = destUpdated as unknown as InventoryRow;
    } else {
      const { data: created, error: cErr } = await client
        .from("inventory").insert({
          warehouse_id: data.destinationWarehouseId,
          product_id: source.product_id,
          unit: source.unit,
          quantity: data.quantity,
          reserved: 0,
          low_stock_threshold: Number(source.low_stock_threshold) || 0,
        })
        .select(INVENTORY_SELECT).single();
      if (cErr) throw new Error(cErr.message);
      dest = created as unknown as InventoryRow;
    }

    const reason = data.reason || `Transfer to ${dest.warehouse?.name ?? "warehouse"}`;
    const reference = data.reference || null;

    const { data: outMv } = await client.from("stock_movements").insert({
      inventory_id: data.inventoryId,
      warehouse_id: source.warehouse_id,
      product_id: source.product_id,
      movement_type: "transfer_out",
      quantity: data.quantity,
      previous_qty: srcPrev,
      new_qty: srcNext,
      unit: source.unit,
      reason, reference,
      performed_by: context.userId,
    }).select("id").single();

    await client.from("stock_movements").insert({
      inventory_id: dest.id,
      warehouse_id: dest.warehouse_id,
      product_id: dest.product_id,
      movement_type: "transfer_in",
      quantity: data.quantity,
      previous_qty: destPrev,
      new_qty: destPrev + data.quantity,
      unit: dest.unit,
      reason, reference,
      related_movement_id: (outMv as { id: string } | null)?.id ?? null,
      performed_by: context.userId,
    });

    return {
      source: toInventoryRecord(srcUpdated as unknown as InventoryRow),
      destination: toInventoryRecord(dest),
    };
  });

export const deleteInventoryRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => inventoryIdSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await asAny(context.supabase)
      .from("inventory").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

// --------------------------------------------------------------------------
// Movement history
// --------------------------------------------------------------------------
interface MovementRow {
  id: string;
  inventory_id: string | null;
  warehouse_id: string;
  product_id: string;
  movement_type: StockMovementRecord["movementType"];
  quantity: number | string;
  previous_qty: number | string;
  new_qty: number | string;
  unit: string;
  reason: string | null;
  reference: string | null;
  created_at: string;
  warehouse: { id: string; name: string } | null;
  product: { id: string; name: string } | null;
}

const MOVEMENT_SELECT = `
  id, inventory_id, warehouse_id, product_id, movement_type, quantity,
  previous_qty, new_qty, unit, reason, reference, created_at,
  warehouse:warehouses!stock_movements_warehouse_id_fkey ( id, name ),
  product:products!stock_movements_product_id_fkey ( id, name )
`;

function toMovementRecord(row: MovementRow): StockMovementRecord {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse?.name ?? null,
    productId: row.product_id,
    productName: row.product?.name ?? null,
    movementType: row.movement_type,
    quantity: Number(row.quantity) || 0,
    previousQty: Number(row.previous_qty) || 0,
    newQty: Number(row.new_qty) || 0,
    unit: row.unit,
    reason: row.reason,
    reference: row.reference,
    createdAt: row.created_at,
  };
}

export const listStockMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listMovementsSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ items: StockMovementRecord[]; total: number }> => {
    const client = asAny(context.supabase);
    let query = client.from("stock_movements").select(MOVEMENT_SELECT, { count: "exact" });
    if (data.inventoryId) query = query.eq("inventory_id", data.inventoryId);
    if (data.warehouseId) query = query.eq("warehouse_id", data.warehouseId);
    if (data.productId) query = query.eq("product_id", data.productId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return {
      items: ((rows ?? []) as unknown as MovementRow[]).map(toMovementRecord),
      total: count ?? 0,
    };
  });
