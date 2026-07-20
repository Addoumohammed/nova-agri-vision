// Server-only. Lovable AI Gateway with automatic model fallback,
// plus optional direct-provider overrides (OpenAI, Anthropic, Gemini, DeepSeek)
// when the user brings their own API key.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export type ProviderId = "lovable" | "openai" | "anthropic" | "gemini" | "deepseek";

type ProviderSpec = {
  id: ProviderId;
  name: string;
  baseURL: string;
  header: (key: string) => Record<string, string>;
  /** Ordered list of models to attempt on this provider. First is the default. */
  models: string[];
};

const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  lovable: {
    id: "lovable",
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    header: (k) => ({ "Lovable-API-Key": k, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }),
    // Multi-family fallback: OpenAI flagship → Gemini flagship → cheaper OpenAI → cheaper Gemini.
    models: [
      "openai/gpt-5.5",
      "google/gemini-3.1-pro-preview",
      "openai/gpt-5.4-mini",
      "google/gemini-3.5-flash",
    ],
  },
  openai: {
    id: "openai",
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    header: (k) => ({ Authorization: `Bearer ${k}` }),
    models: ["gpt-4o", "gpt-4o-mini"],
  },
  anthropic: {
    id: "anthropic",
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    header: (k) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" }),
    models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  },
  gemini: {
    id: "gemini",
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    header: (k) => ({ Authorization: `Bearer ${k}` }),
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
  deepseek: {
    id: "deepseek",
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    header: (k) => ({ Authorization: `Bearer ${k}` }),
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
};

function readKey(id: ProviderId): string | undefined {
  switch (id) {
    case "lovable":
      return process.env.LOVABLE_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
  }
}

export class AiConfigError extends Error {
  status = 503;
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

/**
 * Choose the active provider. Preference order:
 *   1. AI_PROVIDER env override (if that provider has a key)
 *   2. Lovable AI Gateway (LOVABLE_API_KEY)
 *   3. Any direct provider with a configured key
 * Throws AiConfigError with a clear message when nothing is configured.
 */
export function selectProvider(): { spec: ProviderSpec; apiKey: string } {
  const requested = (process.env.AI_PROVIDER as ProviderId | undefined)?.toLowerCase() as ProviderId | undefined;
  const order: ProviderId[] = [];
  if (requested && PROVIDERS[requested]) order.push(requested);
  order.push("lovable", "openai", "anthropic", "gemini", "deepseek");

  const tried: ProviderId[] = [];
  for (const id of order) {
    if (tried.includes(id)) continue;
    tried.push(id);
    const key = readKey(id);
    if (key) return { spec: PROVIDERS[id], apiKey: key };
  }
  throw new AiConfigError(
    "No AI provider is configured. Enable Lovable AI (LOVABLE_API_KEY) or set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / DEEPSEEK_API_KEY.",
  );
}

/** Ordered list of models to try on the active provider (for fallback). */
export function getModelFallbacks(spec: ProviderSpec, preferred?: string): string[] {
  const list = [...spec.models];
  if (preferred && !list.includes(preferred)) list.unshift(preferred);
  else if (preferred) {
    // Move preferred to the front.
    list.splice(list.indexOf(preferred), 1);
    list.unshift(preferred);
  }
  return list;
}

export function createGateway(initialRunId?: string) {
  const { spec, apiKey } = selectProvider();

  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (v: string | undefined) => void = () => {};
  let resolved = false;
  const runIdReady = new Promise<string | undefined>((r) => {
    resolveRunId = r;
  });
  const publishRunId = (v?: string) => {
    const next = v?.trim() || undefined;
    if (!runId && next) runId = next;
    if (!resolved) {
      resolved = true;
      resolveRunId(runId);
    }
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
    supportsStructuredOutputs: spec.id === "openai" || spec.id === "lovable",
  });

  return {
    provider,
    spec,
    apiKey,
    model: (id?: string) => provider(id ?? spec.models[0]),
    fallbacks: (preferred?: string) => getModelFallbacks(spec, preferred),
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
  if (!token) throw new Response("Unauthorized: missing bearer token", { status: 401 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized: invalid or expired session", { status: 401 });
  return data.user.id;
}

/** GPT-5.6 chat-completions requests must set reasoning_effort:"none" when using tools/streaming. */
export function providerOptionsFor(
  modelId: string,
): Record<string, Record<string, import("ai").JSONValue>> | undefined {
  if (modelId.startsWith("openai/gpt-5.6")) {
    return { lovable: { reasoningEffort: "none" } };
  }
  return undefined;
}
