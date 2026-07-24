import { createServerFn } from "@tanstack/react-start";

/**
 * Production integrations layer for Nova Pro.
 *
 * All outbound calls to third-party services go through `resilientFetch`, which
 * layers on top of the native fetch:
 *   - Per-request timeout via AbortController (default 12s, configurable).
 *   - Exponential backoff with full jitter for transient failures.
 *   - Automatic retry on network errors, 408, 425, 429, and 5xx (except 501).
 *   - Honors `Retry-After` header (seconds or HTTP date) on 429 / 503.
 *   - Bounded attempts (default 3) to prevent hot loops.
 *
 * Secrets are only ever read inside handler bodies — never at module scope.
 */

// ------------------------------ Result helpers ------------------------------
type ErrMeta = Record<string, string | number | null | undefined>;
const OK = <T,>(data: T) => ({ ok: true as const, data });
const ERR = (reason: string, meta?: ErrMeta) => ({
  ok: false as const,
  reason,
  ...(meta ? { meta } : {}),
});

// ------------------------------ Resilient fetch -----------------------------
type ResilientOpts = RequestInit & {
  /** Per-attempt timeout, ms. Default 12_000. */
  timeoutMs?: number;
  /** Max attempts including the first. Default 3. */
  retries?: number;
  /** Base backoff in ms for exponential backoff. Default 400. */
  backoffMs?: number;
  /** Cap on backoff wait between attempts. Default 8_000. */
  maxBackoffMs?: number;
  /** Label used in error messages. Default "request". */
  label?: string;
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function parseRetryAfter(h: string | null): number | null {
  if (!h) return null;
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const dateMs = Date.parse(h);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function resilientFetch(url: string, opts: ResilientOpts = {}): Promise<Response> {
  const {
    timeoutMs = 12_000,
    retries = 3,
    backoffMs = 400,
    maxBackoffMs = 8_000,
    label = "request",
    signal: userSignal,
    ...init
  } = opts;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    // Chain user-supplied signal so callers can still cancel.
    const onUserAbort = () => ac.abort((userSignal as AbortSignal | undefined)?.reason);
    if (userSignal) {
      if (userSignal.aborted) ac.abort(userSignal.reason);
      else userSignal.addEventListener("abort", onUserAbort, { once: true });
    }
    try {
      const res = await fetch(url, { ...init, signal: ac.signal });
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === retries) return res;
      // Retryable status — wait then retry.
      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
      const base = Math.min(maxBackoffMs, backoffMs * 2 ** (attempt - 1));
      const jitter = Math.random() * base;
      await wait(retryAfter ?? jitter);
      lastErr = new Error(`${label} http ${res.status}`);
    } catch (e) {
      lastErr = e;
      if (attempt === retries) throw e;
      const base = Math.min(maxBackoffMs, backoffMs * 2 ** (attempt - 1));
      await wait(Math.random() * base);
    } finally {
      clearTimeout(timer);
      if (userSignal) userSignal.removeEventListener("abort", onUserAbort);
    }
  }
  throw lastErr ?? new Error(`${label} failed`);
}

async function safeJson<T = unknown>(r: Response): Promise<T | null> {
  try {
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// ---------------- Geocoding: OpenStreetMap Nominatim (keyless) ---------------
export const geocodeOSM = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    if (!data.q?.trim()) return ERR("empty_query");
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(data.q)}&format=json&limit=5`;
      const res = await resilientFetch(url, {
        headers: { "User-Agent": "NovaPro/1.0 (contact@novapro.app)", Accept: "application/json" },
        label: "osm.geocode",
        timeoutMs: 8_000,
      });
      if (!res.ok) return ERR(`http_${res.status}`);
      const rows = (await res.json()) as Array<{ display_name: string; lat: string; lon: string; type: string }>;
      return OK(
        rows.map((r) => ({ name: r.display_name, lat: parseFloat(r.lat), lon: parseFloat(r.lon), type: r.type })),
      );
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---------------- Geocoding: Google Maps (paid, key required) ----------------
export const geocodeGoogle = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return ERR("missing_key");
    if (!data.q?.trim()) return ERR("empty_query");
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(data.q)}&key=${key}`;
      const res = await resilientFetch(url, { label: "google.geocode" });
      const json = (await safeJson<{
        status: string;
        error_message?: string;
        results: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
      }>(res)) ?? { status: "PARSE_ERROR", results: [] };
      if (json.status !== "OK") return ERR(json.status, { message: json.error_message });
      return OK(
        json.results.map((r) => ({
          name: r.formatted_address,
          lat: r.geometry.location.lat,
          lon: r.geometry.location.lng,
        })),
      );
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---------------- Weather: OpenWeather (key required) -----------------------
export const getWeather = createServerFn({ method: "GET" })
  .inputValidator((d: { lat: number; lon: number; units?: "metric" | "imperial" }) => d)
  .handler(async ({ data }) => {
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) return ERR("missing_key");
    const units = data.units ?? "metric";
    try {
      const [curRes, fcRes] = await Promise.all([
        resilientFetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${data.lat}&lon=${data.lon}&units=${units}&appid=${key}`,
          { label: "openweather.current" },
        ),
        resilientFetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${data.lat}&lon=${data.lon}&units=${units}&appid=${key}`,
          { label: "openweather.forecast" },
        ),
      ]);
      const cur = (await safeJson<any>(curRes)) ?? {};
      const fc = (await safeJson<any>(fcRes)) ?? {};
      if (cur.cod && cur.cod !== 200) return ERR(String(cur.message ?? cur.cod));
      return OK({
        current: {
          temp: cur.main?.temp,
          feels_like: cur.main?.feels_like,
          humidity: cur.main?.humidity,
          wind: cur.wind?.speed,
          desc: cur.weather?.[0]?.description,
          icon: cur.weather?.[0]?.icon,
          city: cur.name,
          sunrise: cur.sys?.sunrise,
          sunset: cur.sys?.sunset,
        },
        forecast: (fc.list ?? []).slice(0, 40).map((f: any) => ({
          dt: f.dt,
          temp: f.main.temp,
          humidity: f.main.humidity,
          rain: f.rain?.["3h"] ?? 0,
          desc: f.weather?.[0]?.description,
          icon: f.weather?.[0]?.icon,
        })),
      });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---------------- ExchangeRate (keyless: frankfurter → open.er-api fallback) -
export const getExchangeRatesLive = createServerFn({ method: "GET" })
  .inputValidator((d: { base?: string }) => d)
  .handler(async ({ data }) => {
    const base = (data.base ?? "USD").toUpperCase();
    try {
      const res = await resilientFetch(`https://api.frankfurter.app/latest?from=${base}`, {
        label: "frankfurter",
        timeoutMs: 6_000,
      });
      if (res.ok) {
        const json = (await res.json()) as { base: string; date: string; rates: Record<string, number> };
        return OK({ base: json.base, date: json.date, rates: json.rates, source: "ECB/Frankfurter" });
      }
      // Fallback: open.er-api.com (keyless)
      const res2 = await resilientFetch(`https://open.er-api.com/v6/latest/${base}`, {
        label: "open-er-api",
        timeoutMs: 6_000,
      });
      const json2 = (await res2.json()) as {
        base_code: string;
        time_last_update_utc: string;
        rates: Record<string, number>;
      };
      return OK({
        base: json2.base_code,
        date: json2.time_last_update_utc,
        rates: json2.rates,
        source: "open.er-api",
      });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---------------- World Bank Open Data (keyless) ----------------------------
export const getWorldBankIndicator = createServerFn({ method: "GET" })
  .inputValidator((d: { country: string; indicator: string; start?: number; end?: number }) => d)
  .handler(async ({ data }) => {
    try {
      const start = data.start ?? 2015;
      const end = data.end ?? new Date().getFullYear();
      const url = `https://api.worldbank.org/v2/country/${data.country}/indicator/${data.indicator}?format=json&date=${start}:${end}&per_page=100`;
      const res = await resilientFetch(url, { label: "worldbank" });
      const json = (await res.json()) as [
        unknown,
        Array<{
          date: string;
          value: number | null;
          country: { value: string };
          indicator: { value: string };
        }>,
      ];
      const rows = (json[1] ?? [])
        .filter((r) => r.value !== null)
        .map((r) => ({ year: parseInt(r.date), value: r.value as number }));
      return OK({
        country: json[1]?.[0]?.country?.value,
        indicator: json[1]?.[0]?.indicator?.value,
        series: rows.reverse(),
      });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---------------- FAOSTAT (keyless public API) ------------------------------
export const getFaostatProduction = createServerFn({ method: "GET" })
  .inputValidator((d: { area?: string; item?: string; year?: number }) => d)
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams({
        area_cs: "M49",
        area: data.area ?? "818",
        item: data.item ?? "15",
        year: String(data.year ?? new Date().getFullYear() - 2),
        element: "5510",
        show_codes: "true",
        show_unit: "true",
        show_flags: "true",
        null_values: "false",
        output_type: "objects",
      });
      const url = `https://faostatservices.fao.org/api/v1/en/data/QCL?${params}`;
      const res = await resilientFetch(url, { label: "faostat", timeoutMs: 15_000 });
      if (!res.ok) return ERR(`http_${res.status}`);
      const json = (await res.json()) as { data: Array<Record<string, string | number | null>> };
      return OK({ rows: json.data ?? [] });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// =========================== TRANSACTIONAL SERVICES =========================

// ---- Email: Resend ---------------------------------------------------------
export const sendEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { to: string | string[]; subject: string; html?: string; text?: string; from?: string }) => {
    if (!d.subject?.trim()) throw new Error("subject_required");
    if (!d.html && !d.text) throw new Error("body_required");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return ERR("missing_key");
    const from = data.from ?? process.env.RESEND_FROM ?? "Nova Pro <onboarding@resend.dev>";
    try {
      const r = await resilientFetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(data.to) ? data.to : [data.to],
          subject: data.subject,
          html: data.html,
          text: data.text,
        }),
        label: "resend.send",
      });
      const body = await safeJson<{ id?: string; message?: string }>(r);
      if (!r.ok) return ERR(`http_${r.status}`, { message: body?.message });
      return OK({ id: body?.id });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---- SMS: Twilio -----------------------------------------------------------
export const sendSMS = createServerFn({ method: "POST" })
  .inputValidator((d: { to: string; body: string; from?: string }) => {
    if (!/^\+\d{6,15}$/.test(d.to)) throw new Error("invalid_to_e164");
    if (!d.body?.trim()) throw new Error("body_required");
    if (d.body.length > 1600) throw new Error("body_too_long");
    return d;
  })
  .handler(async ({ data }) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = data.from ?? process.env.TWILIO_FROM;
    if (!sid || !token) return ERR("missing_key");
    if (!from) return ERR("missing_from");
    try {
      const auth = btoa(`${sid}:${token}`);
      const body = new URLSearchParams({ To: data.to, From: from, Body: data.body });
      const r = await resilientFetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        label: "twilio.send",
      });
      const json = await safeJson<{ sid?: string; message?: string; code?: number }>(r);
      if (!r.ok) return ERR(`http_${r.status}`, { message: json?.message, code: json?.code });
      return OK({ sid: json?.sid });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---- Push: Firebase Cloud Messaging (legacy HTTP) --------------------------
export const sendPush = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; title: string; body: string; data?: Record<string, string> }) => {
    if (!d.token) throw new Error("token_required");
    if (!d.title || !d.body) throw new Error("payload_required");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.FCM_SERVER_KEY;
    if (!key) return ERR("missing_key");
    try {
      const r = await resilientFetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: data.token,
          notification: { title: data.title, body: data.body },
          data: data.data ?? {},
        }),
        label: "fcm.send",
      });
      const json = await safeJson<{ success?: number; failure?: number; results?: unknown[] }>(r);
      if (!r.ok) return ERR(`http_${r.status}`);
      if (json?.failure && json.failure > 0) return ERR("delivery_failure", { failures: json.failure });
      return OK({ success: json?.success ?? 0 });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---- Cloud Storage: signed upload URL via Supabase Storage -----------------
export const createUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { bucket: string; path: string }) => {
    if (!d.bucket || !d.path) throw new Error("bucket_and_path_required");
    if (d.path.includes("..") || d.path.startsWith("/")) throw new Error("invalid_path");
    return d;
  })
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed, error } = await supabaseAdmin.storage
        .from(data.bucket)
        .createSignedUploadUrl(data.path);
      if (error || !signed) return ERR(error?.message ?? "sign_failed");
      return OK({ path: signed.path, token: signed.token, signedUrl: signed.signedUrl });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---------------- Connection status for all providers -----------------------
export type ProviderStatus = {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  envVar: string | null;
  keyless: boolean;
  docs: string;
};

export const getIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  const providers: ProviderStatus[] = [
    { id: "supabase", name: "Lovable Cloud (DB / Auth / Storage / Realtime)", category: "Backend", configured: !!process.env.SUPABASE_URL, envVar: "SUPABASE_URL", keyless: true, docs: "Built-in" },
    { id: "lovable_ai", name: "Lovable AI Gateway", category: "AI", configured: !!process.env.LOVABLE_API_KEY, envVar: "LOVABLE_API_KEY", keyless: true, docs: "Auto-provisioned" },
    { id: "openai", name: "OpenAI", category: "AI", configured: !!process.env.OPENAI_API_KEY, envVar: "OPENAI_API_KEY", keyless: false, docs: "https://platform.openai.com/api-keys" },
    { id: "gemini", name: "Google Gemini", category: "AI", configured: !!process.env.GEMINI_API_KEY, envVar: "GEMINI_API_KEY", keyless: false, docs: "https://aistudio.google.com/apikey" },
    { id: "anthropic", name: "Anthropic Claude", category: "AI", configured: !!process.env.ANTHROPIC_API_KEY, envVar: "ANTHROPIC_API_KEY", keyless: false, docs: "https://console.anthropic.com/" },
    { id: "deepseek", name: "DeepSeek", category: "AI", configured: !!process.env.DEEPSEEK_API_KEY, envVar: "DEEPSEEK_API_KEY", keyless: false, docs: "https://platform.deepseek.com/" },
    { id: "openweather", name: "OpenWeather", category: "Weather", configured: !!process.env.OPENWEATHER_API_KEY, envVar: "OPENWEATHER_API_KEY", keyless: false, docs: "https://openweathermap.org/api" },
    { id: "google_maps", name: "Google Maps Platform", category: "Maps", configured: !!process.env.GOOGLE_MAPS_API_KEY, envVar: "GOOGLE_MAPS_API_KEY", keyless: false, docs: "https://console.cloud.google.com/google/maps-apis" },
    { id: "osm", name: "OpenStreetMap (Nominatim)", category: "Maps", configured: true, envVar: null, keyless: true, docs: "https://nominatim.org" },
    { id: "frankfurter", name: "Frankfurter FX (ECB)", category: "Finance", configured: true, envVar: null, keyless: true, docs: "https://frankfurter.app" },
    { id: "exchangerate", name: "ExchangeRate-API", category: "Finance", configured: !!process.env.EXCHANGERATE_API_KEY, envVar: "EXCHANGERATE_API_KEY", keyless: false, docs: "https://www.exchangerate-api.com/" },
    { id: "worldbank", name: "World Bank Open Data", category: "Data", configured: true, envVar: null, keyless: true, docs: "https://data.worldbank.org" },
    { id: "faostat", name: "FAOSTAT", category: "Data", configured: true, envVar: null, keyless: true, docs: "https://www.fao.org/faostat" },
    { id: "fcm", name: "Firebase Cloud Messaging", category: "Notifications", configured: !!process.env.FCM_SERVER_KEY, envVar: "FCM_SERVER_KEY", keyless: false, docs: "https://console.firebase.google.com/" },
    { id: "twilio", name: "Twilio (SMS / WhatsApp)", category: "Notifications", configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN), envVar: "TWILIO_AUTH_TOKEN", keyless: false, docs: "https://console.twilio.com/" },
    { id: "stripe", name: "Stripe", category: "Payments", configured: !!process.env.STRIPE_SECRET_KEY, envVar: "STRIPE_SECRET_KEY", keyless: false, docs: "https://dashboard.stripe.com/apikeys" },
    { id: "paypal", name: "PayPal", category: "Payments", configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET), envVar: "PAYPAL_CLIENT_SECRET", keyless: false, docs: "https://developer.paypal.com/" },
    { id: "resend", name: "Resend (Email)", category: "Email", configured: !!process.env.RESEND_API_KEY, envVar: "RESEND_API_KEY", keyless: false, docs: "https://resend.com/api-keys" },
  ];
  return providers;
});

// ---------------- Live validation of paid API keys --------------------------
export const validateProviderKey = createServerFn({ method: "POST" })
  .inputValidator((d: { provider: string }) => d)
  .handler(async ({ data }) => {
    const check = async (label: string, url: string, init?: RequestInit) => {
      const r = await resilientFetch(url, { ...init, label, retries: 2, timeoutMs: 8_000 });
      return r;
    };
    try {
      switch (data.provider) {
        case "supabase": {
          return process.env.SUPABASE_URL ? OK({ status: "connected" }) : ERR("missing_key");
        }
        case "lovable_ai": {
          return process.env.LOVABLE_API_KEY ? OK({ status: "connected" }) : ERR("missing_key");
        }
        case "openweather": {
          const key = process.env.OPENWEATHER_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("openweather.validate", `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${key}`);
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "google_maps": {
          const key = process.env.GOOGLE_MAPS_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("google.validate", `https://maps.googleapis.com/maps/api/geocode/json?address=Cairo&key=${key}`);
          const j = (await safeJson<{ status: string; error_message?: string }>(r)) ?? { status: "PARSE_ERROR" };
          return j.status === "OK" ? OK({ status: "connected" }) : ERR(j.status, { message: j.error_message });
        }
        case "openai": {
          const key = process.env.OPENAI_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("openai.validate", "https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "gemini": {
          const key = process.env.GEMINI_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("gemini.validate", `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "anthropic": {
          const key = process.env.ANTHROPIC_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("anthropic.validate", "https://api.anthropic.com/v1/models", {
            headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "deepseek": {
          const key = process.env.DEEPSEEK_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("deepseek.validate", "https://api.deepseek.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "stripe": {
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("stripe.validate", "https://api.stripe.com/v1/balance", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "paypal": {
          const id = process.env.PAYPAL_CLIENT_ID;
          const secret = process.env.PAYPAL_CLIENT_SECRET;
          if (!id || !secret) return ERR("missing_key");
          const base = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
          const r = await check("paypal.validate", `${base}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "resend": {
          const key = process.env.RESEND_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("resend.validate", "https://api.resend.com/domains", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "twilio": {
          const sid = process.env.TWILIO_ACCOUNT_SID;
          const token = process.env.TWILIO_AUTH_TOKEN;
          if (!sid || !token) return ERR("missing_key");
          const r = await check("twilio.validate", `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
            headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "fcm": {
          const key = process.env.FCM_SERVER_KEY;
          if (!key) return ERR("missing_key");
          // Dry-run FCM validation: sending to an invalid token returns 200 with
          // an error body if the server key is valid, and 401 if it isn't.
          const r = await resilientFetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: { Authorization: `key=${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ to: "validation-check", dry_run: true }),
            label: "fcm.validate",
            retries: 2,
          });
          if (r.status === 401) return ERR("unauthorized");
          return OK({ status: "connected" });
        }
        case "exchangerate": {
          const key = process.env.EXCHANGERATE_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await check("exchangerate.validate", `https://v6.exchangerate-api.com/v6/${key}/latest/USD`);
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "frankfurter": {
          const r = await check("frankfurter.validate", "https://api.frankfurter.app/latest?from=USD");
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "worldbank": {
          const r = await check("worldbank.validate", "https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json&per_page=1");
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "faostat": {
          const r = await check("faostat.validate", "https://faostatservices.fao.org/api/v1/en/dimensions/QCL");
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "osm": {
          const r = await check("osm.validate", "https://nominatim.openstreetmap.org/search?q=Cairo&format=json&limit=1", {
            headers: { "User-Agent": "NovaPro/1.0" },
          });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        default:
          return ERR("unknown_provider");
      }
    } catch (e) {
      return ERR((e as Error).message);
    }
  });
