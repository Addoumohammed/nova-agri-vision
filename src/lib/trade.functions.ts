// Server functions for global trade: RFQs, quotations, negotiation, currency, trade docs, smart contracts.
// Uses runtime table names not yet in the regenerated types — cast the client where needed.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createHash } from "node:crypto";

const asAny = (c: unknown) => c as unknown as SupabaseClient;

// ============ RFQs ============
export const listRfqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await asAny(context.supabase)
      .from("rfqs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRfq = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rfq, error } = await asAny(context.supabase)
      .from("rfqs").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!rfq) return null;
    const { data: quotations, error: qErr } = await asAny(context.supabase)
      .from("quotations").select("*").eq("rfq_id", data.id).order("created_at", { ascending: false });
    if (qErr) throw new Error(qErr.message);
    return { rfq, quotations: quotations ?? [] };
  });

export const createRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      title: z.string().min(3).max(200),
      description: z.string().max(2000).optional(),
      product_category: z.string().max(100).optional(),
      product_name: z.string().min(1).max(200),
      quantity: z.number().positive(),
      unit: z.string().max(20).default("MT"),
      target_price: z.number().positive().optional(),
      currency: z.string().length(3).default("USD"),
      incoterm: z.string().max(4).optional(),
      destination_country: z.string().length(2).optional(),
      destination_port: z.string().max(120).optional(),
      required_certifications: z.array(z.string()).max(20).default([]),
      deadline: z.string().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, buyer_id: context.userId };
    const { data: row, error } = await asAny(context.supabase)
      .from("rfqs").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const closeRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await asAny(context.supabase)
      .from("rfqs").update({ status: "closed" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Quotations ============
export const submitQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      rfq_id: z.string().uuid(),
      unit_price: z.number().positive(),
      currency: z.string().length(3).default("USD"),
      quantity: z.number().positive(),
      incoterm: z.string().min(2).max(4),
      lead_time_days: z.number().int().positive().optional(),
      validity_date: z.string().optional(),
      payment_terms: z.string().max(500).optional(),
      notes: z.string().max(2000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, supplier_id: context.userId };
    const { data: row, error } = await asAny(context.supabase)
      .from("quotations").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyQuotations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sent, received] = await Promise.all([
      asAny(context.supabase).from("quotations").select("*, rfqs(*)")
        .eq("supplier_id", context.userId).order("created_at", { ascending: false }),
      asAny(context.supabase).from("quotations").select("*, rfqs!inner(*)")
        .eq("rfqs.buyer_id", context.userId).order("created_at", { ascending: false }),
    ]);
    if (sent.error) throw new Error(sent.error.message);
    if (received.error) throw new Error(received.error.message);
    return { sent: sent.data ?? [], received: received.data ?? [] };
  });

export const setQuotationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["accepted", "rejected", "under_negotiation", "withdrawn"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await asAny(context.supabase)
      .from("quotations").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Negotiation ============
export const listNegotiation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quotation_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: msgs, error } = await asAny(context.supabase)
      .from("negotiation_messages").select("*")
      .eq("quotation_id", data.quotation_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return msgs ?? [];
  });

export const sendNegotiation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      quotation_id: z.string().uuid(),
      message: z.string().min(1).max(2000),
      proposed_price: z.number().positive().optional(),
      proposed_currency: z.string().length(3).optional(),
      proposed_lead_time_days: z.number().int().positive().optional(),
      proposed_incoterm: z.string().min(2).max(4).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, sender_id: context.userId };
    const { data: row, error } = await asAny(context.supabase)
      .from("negotiation_messages").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    // Mark the quotation as under negotiation.
    await asAny(context.supabase)
      .from("quotations").update({ status: "under_negotiation" })
      .eq("id", data.quotation_id).eq("status", "submitted");
    return row;
  });

// ============ Country regulations ============
export const listCountryRegulations = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await asAny(supabaseAdmin)
      .from("country_regulations").select("*")
      .order("country_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ Currency (uses frankfurter.app — free ECB, no key) ============
const RATES_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const RATE_BASE = "USD";
const RATE_QUOTES = ["EUR", "GBP", "AED", "SAR", "EGP", "CNY", "JPY", "INR", "BRL", "MAD", "TRY", "KES", "NGN", "CAD", "AUD", "ZAR"];

export const getExchangeRates = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = asAny(supabaseAdmin);
    const { data: cached } = await admin
      .from("currency_rates").select("*").eq("base", RATE_BASE);

    const freshEnough =
      cached &&
      cached.length >= RATE_QUOTES.length &&
      cached.every((r) => new Date(r.fetched_at).getTime() > Date.now() - RATES_TTL_MS);

    if (freshEnough) {
      return { base: RATE_BASE, rates: Object.fromEntries(cached.map((r) => [r.quote, Number(r.rate)])) as Record<string, number>, cached: true };
    }

    try {
      const url = `https://api.frankfurter.app/latest?from=${RATE_BASE}&to=${RATE_QUOTES.join(",")}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`frankfurter ${res.status}`);
      const json = (await res.json()) as { rates: Record<string, number> };
      const rates: Record<string, number> = { ...json.rates, [RATE_BASE]: 1 };
      const rows = Object.entries(rates).map(([quote, rate]) => ({
        base: RATE_BASE, quote, rate, fetched_at: new Date().toISOString(),
      }));
      await admin.from("currency_rates").upsert(rows, { onConflict: "base,quote" });
      return { base: RATE_BASE, rates, cached: false };
    } catch (err) {
      if (cached && cached.length > 0) {
        return {
          base: RATE_BASE,
          rates: Object.fromEntries(cached.map((r) => [r.quote, Number(r.rate)])) as Record<string, number>,
          cached: true,
          warning: (err as Error).message,
        };
      }
      throw err;
    }
  });

// ============ Trade documents ============
export const listTradeDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ order_id: z.string().uuid().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    let q = asAny(context.supabase).from("trade_documents").select("*")
      .order("created_at", { ascending: false });
    if (data.order_id) q = q.eq("order_id", data.order_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ Smart contracts ============
export const signSmartContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    contract_id: z.string().uuid(),
    smart_terms: z.record(z.string(), z.unknown()),
    auto_execute: z.boolean().default(false),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const hash = createHash("sha256")
      .update(JSON.stringify({ contract_id: data.contract_id, terms: data.smart_terms, signer: context.userId, at: Date.now() }))
      .digest("hex");
    const { error } = await asAny(context.supabase)
      .from("contracts")
      .update({
        smart_terms: data.smart_terms,
        signed_hash: hash,
        auto_execute: data.auto_execute,
      })
      .eq("id", data.contract_id);
    if (error) throw new Error(error.message);
    return { hash };
  });
