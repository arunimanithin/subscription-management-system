import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize, parseBody, parseQuery } from "@/lib/api/guard";
import { fail, fromSupabaseError, list, ok } from "@/lib/api/respond";
import { paymentErrorResponse } from "@/features/billing/payments/errors";
import { listPayments, recordPayment } from "@/features/billing/payments/service";
import { PAYMENT_STATUSES } from "@/types/enums";
import { createPaymentSchema, listQuerySchema } from "@/types/schemas";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

const paymentListQuery = listQuerySchema.extend({ invoice_id: z.string().uuid().optional() });

/** GET /api/payments?invoice_id=&status=&page= – staff see all, customers only their own (RLS). */
export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const query = parseQuery(request, paymentListQuery);
  if (!query.ok) return query.response;

  const { status } = query.data;
  if (status && !(PAYMENT_STATUSES as readonly string[]).includes(status)) {
    return fail("VALIDATION_ERROR", `status must be one of: ${PAYMENT_STATUSES.join(", ")}`);
  }

  const { data, error } = await listPayments(auth.ctx.supabase, query.data);
  if (error) return fromSupabaseError(error);
  return list(data.rows, { page: query.data.page, page_size: query.data.page_size, total: data.total });
}

/**
 * POST /api/payments – admin/staff record a payment. Send a unique `idempotency_key` so a retry or
 * double click returns the original payment (HTTP 200) instead of creating a second one (201).
 */
export async function POST(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const body = await parseBody(request, createPaymentSchema);
  if (!body.ok) return body.response;

  const { data, error } = await recordPayment(auth.ctx.supabase, body.data);
  if (error) return paymentErrorResponse(error);
  return ok(data.payment, data.replayed ? 200 : 201);
}
