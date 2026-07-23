import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { updateProfileSchema, privacySchema } from "@/lib/profile/schemas";
import type { FullProfile, SessionInfo, PrivacyPreferences, AppRole } from "@/lib/profile/types";
import { DEFAULT_PRIVACY } from "@/lib/profile/types";

const AVATAR_SIGNED_TTL = 60 * 60; // 1h

async function signAvatar(
  supabase: {
    storage: {
      from: (b: string) => {
        createSignedUrl: (path: string, ttl: number) => Promise<{ data: { signedUrl: string } | null }>;
      };
    };
  },
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  try {
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, AVATAR_SIGNED_TTL);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

// ---------- Profile ----------------------------------------------------------

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FullProfile> => {
    const { supabase, userId, claims } = context;

    const [{ data: profile, error: pErr }, { data: rolesRows, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    // Ensure profile row exists
    let row = profile;
    if (!row) {
      const { data: created, error: cErr } = await supabase
        .from("profiles")
        .insert({ id: userId })
        .select("*")
        .single();
      if (cErr) throw new Error(cErr.message);
      row = created;
    }

    const avatarSignedUrl = await signAvatar(supabase, row.avatar_url);
    const email = (claims as { email?: string })?.email ?? "";

    return {
      id: row.id,
      email,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      avatarSignedUrl,
      phone: row.phone,
      company: (row as Record<string, unknown>).company as string | null ?? null,
      country: (row as Record<string, unknown>).country as string | null ?? null,
      website: (row as Record<string, unknown>).website as string | null ?? null,
      taxId: (row as Record<string, unknown>).tax_id as string | null ?? null,
      locale: row.locale,
      timezone: (row as Record<string, unknown>).timezone as string | null ?? null,
      dateFormat: (row as Record<string, unknown>).date_format as string | null ?? null,
      roles: (rolesRows ?? []).map((r) => r.role as AppRole),
      createdAt: row.created_at,
      emailConfirmed: Boolean((claims as { email_confirmed_at?: string }).email_confirmed_at),
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
    const patch: ProfileUpdate = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName || null;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.company !== undefined) (patch as Record<string, unknown>).company = data.company || null;
    if (data.country !== undefined) (patch as Record<string, unknown>).country = data.country || null;
    if (data.website !== undefined) (patch as Record<string, unknown>).website = data.website || null;
    if (data.taxId !== undefined) (patch as Record<string, unknown>).tax_id = data.taxId || null;
    if (data.locale !== undefined) patch.locale = data.locale;
    if (data.timezone !== undefined) (patch as Record<string, unknown>).timezone = data.timezone || null;
    if (data.dateFormat !== undefined) (patch as Record<string, unknown>).date_format = data.dateFormat || null;

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Avatar -----------------------------------------------------------

export const setAvatarPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Invalid path");
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.path })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    const signed = await signAvatar(context.supabase, data.path);
    return { ok: true, signedUrl: signed };
  });

export const removeAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: row } = await context.supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (row?.avatar_url) {
      await context.supabase.storage.from("avatars").remove([row.avatar_url]);
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Sessions ---------------------------------------------------------

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionInfo[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // @ts-expect-error - listUserSessions available in supabase-js v2 admin API
    const { data, error } = await supabaseAdmin.auth.admin.listUserSessions(context.userId);
    if (error) throw new Error(error.message);
    const currentSid = (context.claims as { session_id?: string }).session_id ?? null;
    type RawSession = {
      id: string;
      user_agent?: string | null;
      ip?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      not_after?: string | null;
    };
    const rows = (data ?? []) as RawSession[];
    return rows.map((s) => ({
      id: s.id,
      userAgent: s.user_agent ?? null,
      ip: s.ip ?? null,
      createdAt: s.created_at ?? null,
      updatedAt: s.updated_at ?? null,
      notAfter: s.not_after ?? null,
      current: currentSid === s.id,
    }));
  });

export const revokeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verify session belongs to caller
    // @ts-expect-error - admin API
    const { data: list } = await supabaseAdmin.auth.admin.listUserSessions(context.userId);
    const owns = (list ?? []).some((s: { id: string }) => s.id === data.sessionId);
    if (!owns) throw new Error("Session not found");
    // @ts-expect-error - deleteSession is available in v2 admin API
    const { error } = await supabaseAdmin.auth.admin.deleteSession(data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeOtherSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const currentSid = (context.claims as { session_id?: string }).session_id ?? null;
    // @ts-expect-error - admin API
    const { data: list } = await supabaseAdmin.auth.admin.listUserSessions(context.userId);
    let revoked = 0;
    for (const s of (list ?? []) as { id: string }[]) {
      if (s.id === currentSid) continue;
      // @ts-expect-error - admin API
      const { error } = await supabaseAdmin.auth.admin.deleteSession(s.id);
      if (!error) revoked++;
    }
    return { ok: true, revoked };
  });

// ---------- Privacy prefs (stored in user_settings.prefs.privacy) -----------

export const getPrivacyPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PrivacyPreferences> => {
    const { data } = await context.supabase
      .from("user_settings")
      .select("prefs")
      .eq("user_id", context.userId)
      .maybeSingle();
    const prefs = (data?.prefs as Record<string, unknown> | null) ?? {};
    const p = (prefs.privacy as Partial<PrivacyPreferences> | undefined) ?? {};
    return { ...DEFAULT_PRIVACY, ...p };
  });

export const savePrivacyPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => privacySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("user_settings")
      .select("prefs")
      .eq("user_id", context.userId)
      .maybeSingle();
    const prefs = (existing?.prefs as Record<string, unknown> | null) ?? {};
    const next = { ...prefs, privacy: data };
    const { error } = await context.supabase
      .from("user_settings")
      .upsert({ user_id: context.userId, prefs: next }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Data export (queued) --------------------------------------------

export const requestDataExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Log to audit trail; a background job / operator can process it later.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "REQUEST",
      entity: "data_export",
      entity_id: context.userId,
      diff: { requested_at: new Date().toISOString() },
    });
    return { ok: true };
  });

// ---------- Account deletion ------------------------------------------------

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ confirmation: z.literal("delete my account"), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("account_deletion_requests")
      .insert({ user_id: context.userId, reason: data.reason ?? null });
    // Perform the actual deletion. Cascades to profile via FK ON DELETE CASCADE where applicable.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Roles: workspace management (admin-only) ------------------------

export const listWorkspaceMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin-only
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Enrich with profile names
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    return (data ?? []).map((r) => ({
      userId: r.user_id,
      role: r.role as AppRole,
      createdAt: r.created_at,
      fullName: nameById.get(r.user_id) ?? null,
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "moderator", "user"]),
      grant: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: data.userId, role: data.role },
        { onConflict: "user_id,role" },
      );
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    return { ok: true };
  });
