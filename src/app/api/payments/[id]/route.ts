import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { getPayment } from "@/features/billing/payments/service";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/** GET /api/payments/:id */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("VALIDATION_ERROR", "Invalid payment id");

  const { data, error } = await getPayment(auth.ctx.supabase, id);
  if (error) return fromSupabaseError(error);
  return ok(data);
}
