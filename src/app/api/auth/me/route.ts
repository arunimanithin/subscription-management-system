import { authorize } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import type { MeResponse } from "@/types/api";

/** GET /api/auth/me – the signed-in user's profile plus the customer record linked to them (if any). Contract: CONTRACTS.md section 4. */
export async function GET() {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const { supabase, profile } = auth.ctx;

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();

  const body: MeResponse["data"] = { ...profile, customer_id: (customer as { id: string } | null)?.id ?? null };
  return ok(body);
}
