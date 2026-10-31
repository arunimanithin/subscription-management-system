import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ZodType, z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";
import { fail } from "@/lib/api/respond";
import type { Profile } from "@/types/entities";
import type { UserRole } from "@/types/enums";

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
}

type Guarded<T> = ({ ok: true } & T) | { ok: false; response: NextResponse };

/**
 * Authenticate the caller and optionally restrict by role.
 *
 *   const auth = await authorize(["admin", "staff"]);
 *   if (!auth.ok) return auth.response;
 *   const { supabase, profile } = auth.ctx;
 *
 * The returned client acts as the signed-in user, so Postgres RLS still applies.
 */
export async function authorize(roles?: UserRole[]): Promise<Guarded<{ ctx: AuthContext }>> {
  if (!getSupabaseEnv()) {
    return { ok: false, response: fail("INTERNAL_ERROR", "Supabase environment variables are not set") };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, response: fail("UNAUTHENTICATED", "Sign in required") };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile) {
    return { ok: false, response: fail("FORBIDDEN", "No profile found for this user") };
  }
  if (roles && !roles.includes((profile as Profile).role)) {
    return { ok: false, response: fail("FORBIDDEN", "Your role cannot perform this action") };
  }
  return { ok: true, ctx: { supabase, user: data.user, profile: profile as Profile } };
}

/** Validate a JSON body against a shared Zod schema. */
export async function parseBody<S extends ZodType>(
  request: NextRequest,
  schema: S,
): Promise<Guarded<{ data: z.output<S> }>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, response: fail("VALIDATION_ERROR", "Request body must be valid JSON") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, response: fail("VALIDATION_ERROR", "Invalid request body", parsed.error.flatten()) };
  }
  return { ok: true, data: parsed.data };
}

/** Validate URL query parameters against a shared Zod schema. */
export function parseQuery<S extends ZodType>(request: NextRequest, schema: S): Guarded<{ data: z.output<S> }> {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return { ok: false, response: fail("VALIDATION_ERROR", "Invalid query parameters", parsed.error.flatten()) };
  }
  return { ok: true, data: parsed.data };
}
