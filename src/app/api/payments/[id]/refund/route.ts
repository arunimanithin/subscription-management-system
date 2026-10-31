import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { refundPayment } from "@/features/billing/payments/service";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/** POST /api/payments/:id/refund – admin/staff. Marks a succeeded payment as refunded. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("VALIDATION_ERROR", "Invalid payment id");

  const result = await refundPayment(auth.ctx.supabase, id);
  if (result.error) {
    if ("notRefundable" in result) return fail("INVALID_STATE", result.error.message);
    return fromSupabaseError(result.error);
  }
  return ok(result.data);
}
