import type { NextRequest } from "next/server";
import { authorize, parseBody } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { generateInvoiceForSubscription } from "@/features/billing/recurring/service";
import { generateInvoiceSchema } from "@/types/schemas";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/**
 * POST /api/invoices/generate  { subscription_id, issue_date? }
 * Bills ONE period of the subscription (the one starting on its next billing date), issues the
 * invoice and advances the subscription's billing dates, atomically. Idempotent per period:
 * 201 = created, 200 = that period had already been billed (the existing invoice is returned).
 */
export async function POST(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const body = await parseBody(request, generateInvoiceSchema);
  if (!body.ok) return body.response;

  const result = await generateInvoiceForSubscription(auth.ctx.supabase, body.data.subscription_id, body.data.issue_date);
  if (result.ok) return ok(result.invoice, result.replayed ? 200 : 201);
  if (result.kind === "skipped") return fail("INVALID_STATE", result.message, { reason: result.reason });

  const { error } = result;
  switch (error.code) {
    case "P0002":
    case "PGRST116":
      return fail("NOT_FOUND", "Subscription not found");
    case "PB001":
      return fail("INVALID_STATE", error.message);
    case "PB003":
      return fail("CONFLICT", error.message);
    default:
      return fromSupabaseError(error);
  }
}
