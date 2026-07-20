// Server functions for AI conversation management (list, rename, delete, search).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_conversations")
      .select("id, title, model, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: conv, error: convErr } = await context.supabase
      .from("ai_conversations")
      .select("id, title, model, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (convErr) throw new Error(convErr.message);
    if (!conv) return null;
    const { data: msgs, error: msgsErr } = await context.supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    if (msgsErr) throw new Error(msgsErr.message);
    return { conversation: conv, messages: msgs ?? [] };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ title: z.string().max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ai_conversations")
      .insert({ user_id: context.userId, title: data.title ?? "New chat" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_conversations")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ai_conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const like = `%${data.q}%`;
    const { data: hits, error } = await context.supabase
      .from("ai_messages")
      .select("conversation_id, content, created_at, ai_conversations!inner(id, title, user_id)")
      .ilike("content", like)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return hits ?? [];
  });
