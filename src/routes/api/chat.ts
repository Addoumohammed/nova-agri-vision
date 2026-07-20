// Streaming AI chat endpoint. Auth via Supabase bearer. Persists to ai_messages.
// Implements automatic model fallback and clear error responses.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  AiConfigError,
  createGateway,
  getIncomingRunId,
  providerOptionsFor,
  requireUserFromRequest,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Nova AI, the enterprise copilot for Nova Pro — an agricultural intelligence and international-trade platform used by farmers, suppliers, buyers, exporters, importers, and investors.

Your capabilities include:
- Crop disease detection from uploaded images
- Market prediction and commodity price analysis
- Business recommendations for trade opportunities
- Document, PDF, and invoice analysis
- Translation across major trade languages
- Smart search across the user's trade data

Respond in the user's language (English or Arabic). Be concise, actionable, and always cite the reasoning behind numeric estimates. When you're not certain, say so. Format responses with clean Markdown: use headings, tables, and bullet lists when they aid clarity. Never fabricate specific prices, shipping quotes, or regulations — instead, tell the user what data would be needed and how to obtain it.`;

async function persistMessages(opts: {
  conversationId: string;
  userMessage: UIMessage;
  assistantMessage: UIMessage;
  model: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const flatten = (m: UIMessage): string =>
    m.parts
      .map((p) => {
        if (p.type === "text") return p.text;
        if (p.type === "file") return `[file: ${(p as { mediaType?: string }).mediaType ?? "attachment"}]`;
        return "";
      })
      .join("\n")
      .trim();

  const userText = flatten(opts.userMessage);
  const assistantText = flatten(opts.assistantMessage);
  const rows = [
    { conversation_id: opts.conversationId, role: "user" as const, content: userText },
    { conversation_id: opts.conversationId, role: "assistant" as const, content: assistantText },
  ];
  const { error: insertErr } = await supabaseAdmin.from("ai_messages").insert(rows);
  if (insertErr) console.error("[chat] insert failed", insertErr);

  const { data: conv } = await supabaseAdmin
    .from("ai_conversations")
    .select("title")
    .eq("id", opts.conversationId)
    .maybeSingle();
  const patch: { updated_at: string; model: string; title?: string } = {
    updated_at: new Date().toISOString(),
    model: opts.model,
  };
  if (conv?.title === "New chat" && userText) {
    patch.title = userText.slice(0, 80);
  }
  await supabaseAdmin.from("ai_conversations").update(patch).eq("id", opts.conversationId);
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth
        let userId: string;
        try {
          userId = await requireUserFromRequest(request);
        } catch (r) {
          if (r instanceof Response) return r;
          return jsonError("Unauthorized", 401);
        }

        // 2. Body
        let body: {
          messages?: UIMessage[];
          conversationId?: string;
          systemHint?: string;
          model?: string;
        };
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid JSON body", 400);
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) return jsonError("Missing messages", 400);

        // 3. Conversation ownership
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let conversationId = body.conversationId;
        if (conversationId) {
          const { data: existing } = await supabaseAdmin
            .from("ai_conversations")
            .select("id, user_id")
            .eq("id", conversationId)
            .maybeSingle();
          if (!existing || existing.user_id !== userId) {
            return jsonError("Conversation not found or not owned by user", 403);
          }
        } else {
          const { data: fresh, error } = await supabaseAdmin
            .from("ai_conversations")
            .insert({ user_id: userId, title: "New chat" })
            .select("id")
            .single();
          if (error || !fresh) return jsonError("Could not start conversation", 500);
          conversationId = fresh.id;
        }

        // 4. Gateway
        const initialRunId = getIncomingRunId(request);
        let gateway: ReturnType<typeof createGateway>;
        try {
          gateway = createGateway(initialRunId);
        } catch (e) {
          if (e instanceof AiConfigError) return jsonError(e.message, 503);
          const msg = e instanceof Error ? e.message : "AI provider not configured";
          return jsonError(msg, 500);
        }

        const fallbacks = gateway.fallbacks(body.model);
        const systemContent = body.systemHint
          ? `${SYSTEM_PROMPT}\n\nAdditional context for this turn:\n${body.systemHint}`
          : SYSTEM_PROMPT;
        const modelMessages = await convertToModelMessages(messages);

        // 5. Try models sequentially — fall back on gateway errors before streaming starts.
        let lastError: unknown;
        for (const modelId of fallbacks) {
          try {
            const model = gateway.model(modelId);
            const result = streamText({
              model,
              system: systemContent,
              messages: modelMessages,
              providerOptions: providerOptionsFor(modelId),
              onError: ({ error }) => {
                console.error(`[chat] stream error on ${modelId}`, error);
              },
            });

            // Race the first token against a startup error window so we can fall back.
            const reader = result.fullStream.getReader();
            const first = await reader.read();
            if (first.done) {
              lastError = new Error("Empty stream from provider");
              continue;
            }
            if (first.value.type === "error") {
              lastError = first.value.error;
              console.warn(`[chat] ${modelId} failed at startup, trying next:`, lastError);
              continue;
            }
            // Success — release the reader and hand the stream to the AI SDK response.
            reader.releaseLock();

            const response = result.toUIMessageStreamResponse({
              originalMessages: messages,
              onFinish: async ({ messages: finalMessages }) => {
                try {
                  const lastUser = [...finalMessages].reverse().find((m) => m.role === "user");
                  const lastAssistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
                  if (lastUser && lastAssistant && conversationId) {
                    await persistMessages({
                      conversationId,
                      userMessage: lastUser,
                      assistantMessage: lastAssistant,
                      model: modelId,
                    });
                  }
                } catch (err) {
                  console.error("[chat] persist failed", err);
                }
              },
              headers: {
                "X-Nova-Conversation-Id": conversationId ?? "",
                "X-Nova-Model": modelId,
                "Access-Control-Expose-Headers": "X-Nova-Conversation-Id, X-Nova-Model",
              },
            });
            return response;
          } catch (e) {
            lastError = e;
            console.warn(`[chat] ${modelId} threw, trying next:`, e);
            continue;
          }
        }

        const msg = lastError instanceof Error ? lastError.message : "All AI models failed";
        return jsonError(`AI request failed: ${msg}`, 502);
      },
    },
  },
});
