import { getSupabaseEnv } from "@/lib/env";
import type { HealthReport } from "@/types/api";

/**
 * Checks configuration and (if configured) reaches Supabase's REST API with the
 * anon key. It reports only booleans/status text – never key values.
 */
export async function getHealth(): Promise<HealthReport> {
  const env = getSupabaseEnv();
  const base: Omit<HealthReport, "supabase"> = {
    app: "ok",
    checked_at: new Date().toISOString(),
    env: {
      supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabase_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
  };
  if (!env) {
    return {
      ...base,
      supabase: { status: "not_configured", detail: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local" },
    };
  }
  try {
    const res = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/products?select=id&limit=1`, {
      headers: { apikey: env.anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { ...base, supabase: { status: "ready", detail: "REST API reachable and the products table exists (migrations applied)" } };
    }
    if (res.status === 401 || res.status === 403) {
      return { ...base, supabase: { status: "invalid_key", detail: `Supabase rejected the anon key (HTTP ${res.status})` } };
    }
    const body = await res.text();
    if (res.status === 404 || /PGRST205|42P01/.test(body)) {
      return { ...base, supabase: { status: "schema_missing", detail: "Reached Supabase but the products table is missing – apply the migrations" } };
    }
    return { ...base, supabase: { status: "unreachable", detail: `Unexpected response (HTTP ${res.status})` } };
  } catch (e) {
    return { ...base, supabase: { status: "unreachable", detail: e instanceof Error ? e.message : "Request failed" } };
  }
}
