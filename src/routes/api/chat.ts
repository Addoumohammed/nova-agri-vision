// Streaming AI chat endpoint. Auth via Supabase bearer. Persists to ai_messages.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGateway, getIncomingRunId, requireUserFromRequest } from "@/lib/ai-gateway.server";

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
  userId: string;
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
  await supabaseAdmin.from("ai_messages").insert(rows);

  // Update conversation timestamp; if it's still the default title, derive one from the first user message.
  const { data: conv } = await supabaseAdmin
    .from("ai_conversations")
    .select("title")
    .eq("id", opts.conversationId)
    .maybeSingle();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), model: opts.model };
  if (conv?.title === "New chat" && userText) {
    patch.title = userText.slice(0, 80);
  }
  await supabaseAdmin.from("ai_conversations").update(patch).eq("id", opts.conversationId);
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId: string;
        try {
          userId = await requireUserFromRequest(request);
        } catch (r) {
          return r instanceof Response ? r : new Response("Unauthorized", { status: 401 });
        }

        let body: { messages?: UIMessage[]; conversationId?: string; systemHint?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) return new Response("Missing messages", { status: 400 });

        // Verify conversation ownership; create if missing.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let conversationId = body.conversationId;
        if (conversationId) {
          const { data: existing } = await supabaseAdmin
            .from("ai_conversations")
            .select("id, user_id")
            .eq("id", conversationId)
            .maybeSingle();
          if (!existing || existing.user_id !== userId) {
            return new Response("Forbidden", { status: 403 });
          }
        } else {
          const { data: fresh, error } = await supabaseAdmin
            .from("ai_conversations")
            .insert({ user_id: userId, title: "New chat" })
            .select("id")
            .single();
          if (error || !fresh) return new Response("Could not start conversation", { status: 500 });
          conversationId = fresh.id;
        }

        const initialRunId = getIncomingRunId(request);
        let gateway: ReturnType<typeof createGateway>;
        try {
          gateway = createGateway(initialRunId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI provider not configured";
          return new Response(msg, { status: 500 });
        }

        const modelId = gateway.spec.defaultChat;
        const model = gateway.model(modelId);

        const systemContent = body.systemHint
          ? `${SYSTEM_PROMPT}\n\nAdditional context for this turn:\n${body.systemHint}`
          : SYSTEM_PROMPT;

        const result = streamText({
          model,
          system: systemContent,
          messages: await convertToModelMessages(messages),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              const lastUser = [...finalMessages].reverse().find((m) => m.role === "user");
              const lastAssistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
              if (lastUser && lastAssistant && conversationId) {
                await persistMessages({
                  userId,
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
            "Access-Control-Expose-Headers": "X-Nova-Conversation-Id",
          },
        });

        return response;
      },
    },
  },
});
