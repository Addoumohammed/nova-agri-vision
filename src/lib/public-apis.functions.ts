import { createServerFn } from "@tanstack/react-start";

/**
 * Production integrations layer for Nova Pro.
 * Free / keyless public APIs are called server-side to avoid CORS and
 * to allow future caching. Paid providers (OpenWeather, Google Maps, etc.)
 * read secrets from process.env and return typed connection status.
 */

const OK = <T,>(data: T) => ({ ok: true as const, data });
const ERR = (reason: string) => ({ ok: false as const, reason });

// ---------------- Geocoding: OpenStreetMap Nominatim (keyless) ---------------
export const geocodeOSM = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(data.q)}&format=json&limit=5`;
      const res = await fetch(url, { headers: { "User-Agent": "NovaPro/1.0 (contact@novapro.app)" } });
      if (!res.ok) return ERR(`OSM ${res.status}`);
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
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(data.q)}&key=${key}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        status: string;
        results: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
      };
      if (json.status !== "OK") return ERR(json.status);
      return OK(json.results.map((r) => ({ name: r.formatted_address, lat: r.geometry.location.lat, lon: r.geometry.location.lng })));
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
      const [cur, fc] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${data.lat}&lon=${data.lon}&units=${units}&appid=${key}`).then((r) => r.json()),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${data.lat}&lon=${data.lon}&units=${units}&appid=${key}`).then((r) => r.json()),
      ]);
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

// ---------------- ExchangeRate (keyless: exchangerate.host / frankfurter) ---
export const getExchangeRatesLive = createServerFn({ method: "GET" })
  .inputValidator((d: { base?: string }) => d)
  .handler(async ({ data }) => {
    const base = data.base ?? "USD";
    try {
      // Primary: frankfurter (ECB, keyless, no auth)
      const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
      if (res.ok) {
        const json = (await res.json()) as { base: string; date: string; rates: Record<string, number> };
        return OK({ base: json.base, date: json.date, rates: json.rates, source: "ECB/Frankfurter" });
      }
      // Fallback: open.er-api.com (keyless)
      const res2 = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const json2 = (await res2.json()) as { base_code: string; time_last_update_utc: string; rates: Record<string, number> };
      return OK({ base: json2.base_code, date: json2.time_last_update_utc, rates: json2.rates, source: "open.er-api" });
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
      const res = await fetch(url);
      const json = (await res.json()) as [unknown, Array<{ date: string; value: number | null; country: { value: string }; indicator: { value: string } }>];
      const rows = (json[1] ?? []).filter((r) => r.value !== null).map((r) => ({ year: parseInt(r.date), value: r.value as number }));
      return OK({ country: json[1]?.[0]?.country?.value, indicator: json[1]?.[0]?.indicator?.value, series: rows.reverse() });
    } catch (e) {
      return ERR((e as Error).message);
    }
  });

// ---------------- FAOSTAT (keyless public API) ------------------------------
export const getFaostatProduction = createServerFn({ method: "GET" })
  .inputValidator((d: { area?: string; item?: string; year?: number }) => d)
  .handler(async ({ data }) => {
    try {
      // FAOSTAT bulk API: production QCL domain
      const params = new URLSearchParams({
        area_cs: "M49",
        area: data.area ?? "818", // Egypt
        item: data.item ?? "15",  // Wheat
        year: String(data.year ?? new Date().getFullYear() - 2),
        element: "5510", // Production quantity
        show_codes: "true",
        show_unit: "true",
        show_flags: "true",
        null_values: "false",
        output_type: "objects",
      });
      const url = `https://faostatservices.fao.org/api/v1/en/data/QCL?${params}`;
      const res = await fetch(url);
      if (!res.ok) return ERR(`FAOSTAT ${res.status}`);
      const json = (await res.json()) as { data: Array<Record<string, unknown>> };
      return OK({ rows: json.data ?? [] });
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
    { id: "twilio", name: "Twilio (SMS / WhatsApp)", category: "Notifications", configured: !!process.env.TWILIO_AUTH_TOKEN, envVar: "TWILIO_AUTH_TOKEN", keyless: false, docs: "https://console.twilio.com/" },
    { id: "stripe", name: "Stripe", category: "Payments", configured: !!process.env.STRIPE_SECRET_KEY, envVar: "STRIPE_SECRET_KEY", keyless: false, docs: "https://dashboard.stripe.com/apikeys" },
    { id: "paypal", name: "PayPal", category: "Payments", configured: !!process.env.PAYPAL_CLIENT_SECRET, envVar: "PAYPAL_CLIENT_SECRET", keyless: false, docs: "https://developer.paypal.com/" },
    { id: "resend", name: "Resend (Email)", category: "Email", configured: !!process.env.RESEND_API_KEY, envVar: "RESEND_API_KEY", keyless: false, docs: "https://resend.com/api-keys" },
  ];
  return providers;
});

// ---------------- Live validation of paid API keys --------------------------
export const validateProviderKey = createServerFn({ method: "POST" })
  .inputValidator((d: { provider: string }) => d)
  .handler(async ({ data }) => {
    try {
      switch (data.provider) {
        case "openweather": {
          const key = process.env.OPENWEATHER_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${key}`);
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "google_maps": {
          const key = process.env.GOOGLE_MAPS_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Cairo&key=${key}`);
          const j = await r.json();
          return j.status === "OK" ? OK({ status: "connected" }) : ERR(j.status);
        }
        case "openai": {
          const key = process.env.OPENAI_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "gemini": {
          const key = process.env.GEMINI_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "anthropic": {
          const key = process.env.ANTHROPIC_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await fetch("https://api.anthropic.com/v1/models", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "stripe": {
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) return ERR("missing_key");
          const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "resend": {
          const key = process.env.RESEND_API_KEY;
          if (!key) return ERR("missing_key");
          const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "frankfurter": {
          const r = await fetch("https://api.frankfurter.app/latest?from=USD");
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "worldbank": {
          const r = await fetch("https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json&per_page=1");
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        case "osm": {
          const r = await fetch("https://nominatim.openstreetmap.org/search?q=Cairo&format=json&limit=1", { headers: { "User-Agent": "NovaPro/1.0" } });
          return r.ok ? OK({ status: "connected" }) : ERR(`http_${r.status}`);
        }
        default:
          return ERR("unknown_provider");
      }
    } catch (e) {
      return ERR((e as Error).message);
    }
  });
