import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type NotificationKind = Database["public"]["Enums"]["notification_kind"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export const NOTIFICATION_KINDS: NotificationKind[] = [
  "system", "order", "shipment", "invoice", "message", "ai", "weather", "market",
];

export type NotificationChannel = "in_app" | "email" | "push" | "sms";

export type NotificationPreferences = {
  channels: Record<NotificationChannel, boolean>;
  kinds: Record<NotificationKind, boolean>;
  quietHours: { enabled: boolean; start: string; end: string };
  digestFrequency: "off" | "instant" | "hourly" | "daily";
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: { in_app: true, email: true, push: false, sms: false },
  kinds: {
    system: true, order: true, shipment: true, invoice: true,
    message: true, ai: true, weather: true, market: false,
  },
  quietHours: { enabled: false, start: "22:00", end: "07:00" },
  digestFrequency: "instant",
};

// ---------------- List / Count -----------------------------------------------
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { filter?: "all" | "unread"; kind?: NotificationKind | "all"; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.filter === "unread") q = q.is("read_at", null);
    if (data.kind && data.kind !== "all") q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows as NotificationRow[];
  });

export const countUnread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

// ---------------- Mutations ---------------------------------------------------
export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markUnread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: null })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { onlyRead?: boolean }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("notifications").delete().eq("user_id", context.userId);
    if (data.onlyRead) q = q.not("read_at", "is", null);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Create (self) ----------------------------------------------
// Uses admin client because RLS restricts INSERT to admins.
// We enforce user_id === authenticated user, so users can only create for themselves.
const CreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(1000).optional(),
  kind: z.enum(["system", "order", "shipment", "invoice", "message", "ai", "weather", "market"]).default("system"),
  link: z.string().max(500).optional(),
});

export const createSelfNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: context.userId,
        title: data.title,
        body: data.body ?? null,
        kind: data.kind,
        link: data.link ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as NotificationRow;
  });

// ---------------- Preferences -------------------------------------------------
export const getPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_settings")
      .select("prefs")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const stored = ((data?.prefs as Record<string, unknown> | null) ?? {}) as {
      notifications?: Partial<NotificationPreferences>;
    };
    return { ...DEFAULT_PREFERENCES, ...(stored.notifications ?? {}) } as NotificationPreferences;
  });

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: NotificationPreferences) => d)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("user_settings")
      .select("prefs")
      .eq("user_id", context.userId)
      .maybeSingle();
    const current = ((existing?.prefs as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const next = { ...current, notifications: data };
    const { error } = await context.supabase
      .from("user_settings")
      .upsert({ user_id: context.userId, prefs: next, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
