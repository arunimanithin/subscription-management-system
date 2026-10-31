import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { USER_ROLES, type UserRole } from "@/types/enums";
import { decideRoute } from "./guards";

/**
 * Refreshes the Supabase session cookie (as the foundation's updateSession did) and then applies the
 * route guard rules from ./guards.ts. If Supabase is not configured or cannot be reached the request is
 * let through, so a Supabase outage never turns into a redirect loop.
 */
export async function guardRequest(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let signedIn = false;
  let userId: string | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && error.status && error.status >= 500) return response; // Supabase problem, not "signed out"
    signedIn = !!data.user;
    userId = data.user?.id ?? null;
  } catch {
    return response; // Supabase unreachable: do not block page rendering
  }

  let role: UserRole | null = null;
  if (signedIn && userId) {
    try {
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      const r = (data as { role?: string } | null)?.role;
      role = (USER_ROLES as readonly string[]).includes(r ?? "") ? (r as UserRole) : null;
    } catch {
      role = null;
    }
  }

  const { pathname, search } = request.nextUrl;
  const decision = decideRoute({ pathname, search, signedIn, role });
  if (decision.action === "allow") return response;

  const url = request.nextUrl.clone();
  const [path, query] = decision.to.split("?");
  url.pathname = path;
  url.search = query ? `?${query}` : "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c)); // keep the refreshed session cookie
  return redirect;
}
