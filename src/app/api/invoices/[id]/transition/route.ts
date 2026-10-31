import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize, parseBody } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { issueInvoice } from "@/features/billing/invoices/service";
import { invoiceTransitionSchema } from "@/types/schemas";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/**
 * POST /api/invoices/:id/transition  { action: "issue" | "void" }
 * Part 2 implements "issue" (draft -> open). "void" arrives with the invoice lifecycle in Part 3.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("VALIDATION_ERROR", "Invalid invoice id");
  const body = await parseBody(request, invoiceTransitionSchema);
  if (!body.ok) return body.response;

  if (body.data.action === "void") return fail("NOT_IMPLEMENTED", 'Action "void" is not implemented yet.');

  const result = await issueInvoice(auth.ctx.supabase, id);
  if (result.error) {
    if ("invalidState" in result) return fail("INVALID_STATE", result.error.message);
    return fromSupabaseError(result.error);
  }
  return ok(result.data);
}
