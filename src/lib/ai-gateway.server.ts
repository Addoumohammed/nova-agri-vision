// Server-only. Provider registry + Lovable AI Gateway helper.
// Switch providers via AI_PROVIDER env var. Falls back to Lovable AI (no key needed).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export type ProviderId = "lovable" | "openai" | "anthropic" | "gemini" | "deepseek";

type ProviderSpec = {
  id: ProviderId;
  name: string;
  baseURL: string;
  header: (key: string) => Record<string, string>;
  defaultChat: string;
  defaultVision: string;
};

const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  lovable: {
    id: "lovable",
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    header: (k) => ({ "Lovable-API-Key": k, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }),
    defaultChat: "openai/gpt-5.5",
    defaultVision: "openai/gpt-5.5",
  },
  openai: {
    id: "openai",
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    header: (k) => ({ Authorization: `Bearer ${k}` }),
    defaultChat: "gpt-4o",
    defaultVision: "gpt-4o",
  },
  anthropic: {
    id: "anthropic",
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1/",
    header: (k) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" }),
    defaultChat: "claude-3-5-sonnet-latest",
    defaultVision: "claude-3-5-sonnet-latest",
  },
  gemini: {
    id: "gemini",
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    header: (k) => ({ Authorization: `Bearer ${k}` }),
    defaultChat: "gemini-2.5-flash",
    defaultVision: "gemini-2.5-flash",
  },
  deepseek: {
    id: "deepseek",
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    header: (k) => ({ Authorization: `Bearer ${k}` }),
    defaultChat: "deepseek-chat",
    defaultVision: "deepseek-chat",
  },
};

function readKey(id: ProviderId): string | undefined {
  switch (id) {
    case "lovable": return process.env.LOVABLE_API_KEY;
    case "openai": return process.env.OPENAI_API_KEY;
    case "anthropic": return process.env.ANTHROPIC_API_KEY;
    case "gemini": return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    case "deepseek": return process.env.DEEPSEEK_API_KEY;
  }
}

/** Choose the active provider based on env. Default: lovable. */
export function selectProvider(): { spec: ProviderSpec; apiKey: string } {
  const requested = (process.env.AI_PROVIDER as ProviderId | undefined) ?? "lovable";
  const order: ProviderId[] = [requested, "lovable", "openai", "anthropic", "gemini", "deepseek"];
  for (const id of order) {
    const spec = PROVIDERS[id];
    if (!spec) continue;
    const key = readKey(id);
    if (key) return { spec, apiKey: key };
  }
  throw new Error(
    "No AI provider configured. LOVABLE_API_KEY is missing and no OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / DEEPSEEK_API_KEY fallback found.",
  );
}

export function createGateway(initialRunId?: string) {
  const { spec, apiKey } = selectProvider();

  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (v: string | undefined) => void = () => {};
  let resolved = false;
  const runIdReady = new Promise<string | undefined>((r) => { resolveRunId = r; });
  const publishRunId = (v?: string) => {
    const next = v?.trim() || undefined;
    if (!runId && next) runId = next;
    if (!resolved) { resolved = true; resolveRunId(runId); }
  };
  if (runId) publishRunId(runId);

  const runFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (spec.id === "lovable" && runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
      headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
    }
    try {
      const res = await fetch(input, { ...init, headers });
      if (spec.id === "lovable") {
        publishRunId(res.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
      }
      return res;
    } catch (e) {
      publishRunId(undefined);
      throw e;
    }
  };

  const provider = createOpenAICompatible({
    name: spec.name,
    baseURL: spec.baseURL,
    headers: spec.header(apiKey),
    fetch: runFetch,
    supportsStructuredOutputs: spec.id === "openai",
  });

  return {
    provider,
    spec,
    model: (id?: string) => provider(id ?? spec.defaultChat),
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export function getIncomingRunId(request: Request) {
  return request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
}

/** Verify a Supabase bearer token from a Request and return the user id. */
export async function requireUserFromRequest(request: Request): Promise<string> {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : undefined;
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  return data.user.id;
}
