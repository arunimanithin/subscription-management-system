import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize, parseBody } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { paymentErrorResponse } from "@/features/billing/payments/errors";
import { issueInvoice, voidInvoice } from "@/features/billing/invoices/service";
import { invoiceTransitionSchema } from "@/types/schemas";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/**
 * POST /api/invoices/:id/transition  { action: "issue" | "void", reason? }
 * issue: draft -> open.  void: draft/open/overdue invoice with no payments -> void.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("VALIDATION_ERROR", "Invalid invoice id");
  const body = await parseBody(request, invoiceTransitionSchema);
  if (!body.ok) return body.response;

  if (body.data.action === "void") {
    const voided = await voidInvoice(auth.ctx.supabase, id, body.data.reason);
    if (voided.error) return paymentErrorResponse(voided.error);
    return ok(voided.data);
  }

  const result = await issueInvoice(auth.ctx.supabase, id);
  if (result.error) {
    if ("invalidState" in result) return fail("INVALID_STATE", result.error.message);
    return fromSupabaseError(result.error);
  }
  return ok(result.data);
}
