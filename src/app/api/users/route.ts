import type { NextRequest } from "next/server";
import { authorize, parseQuery } from "@/lib/api/guard";
import { fromSupabaseError, list, toRange } from "@/lib/api/respond";
import { sanitizeSearch, usersQuerySchema } from "@/features/auth-data/users";
import type { Profile } from "@/types/entities";

/** GET /api/users – admin only. Query: page, page_size, search (name or email), role. Contract: CONTRACTS.md section 4. */
export async function GET(request: NextRequest) {
  const auth = await authorize(["admin"]);
  if (!auth.ok) return auth.response;
  const query = parseQuery(request, usersQuerySchema);
  if (!query.ok) return query.response;

  const { page, page_size, search, role } = query.data;
  const [from, to] = toRange(page, page_size);

  let q = auth.ctx.supabase.from("profiles").select("*", { count: "exact" });
  if (role) q = q.eq("role", role);
  const term = search ? sanitizeSearch(search) : "";
  if (term) q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);

  const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) return fromSupabaseError(error);
  return list((data ?? []) as Profile[], { page, page_size, total: count ?? 0 });
}
