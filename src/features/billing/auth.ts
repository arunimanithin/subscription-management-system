import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/entities";

export type PageAuth =
  | { status: "ok"; supabase: SupabaseClient; profile: Profile }
  | { status: "not_configured" | "unauthenticated" | "no_profile" };

/**
 * Billing-local helper for Server Component pages (API routes use lib/api/guard.authorize).
 * Returns a state instead of throwing so a page can show a helpful message.
 * Role checks beyond "has a profile" are done by RLS in the database.
 */
export async function getPageAuth(): Promise<PageAuth> {
  if (!getSupabaseEnv()) return { status: "not_configured" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { status: "unauthenticated" };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile) return { status: "no_profile" };
  return { status: "ok", supabase, profile: profile as Profile };
}
