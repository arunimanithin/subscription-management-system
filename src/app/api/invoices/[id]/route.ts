import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize, parseBody } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { paymentErrorResponse } from "@/features/billing/payments/errors";
import { getInvoice, updateDraftInvoice } from "@/features/billing/invoices/service";
import { updateInvoiceSchema } from "@/types/schemas";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/** GET /api/invoices/:id – invoice with customer, items and payments. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("VALIDATION_ERROR", "Invalid invoice id");

  const { data, error } = await getInvoice(auth.ctx.supabase, id);
  if (error) return fromSupabaseError(error);
  return ok(data);
}

/** PATCH /api/invoices/:id – edit a DRAFT invoice (any subset of fields; `items` replaces all lines). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("VALIDATION_ERROR", "Invalid invoice id");
  const body = await parseBody(request, updateInvoiceSchema);
  if (!body.ok) return body.response;
  if (Object.keys(body.data).length === 0) return fail("VALIDATION_ERROR", "Provide at least one field to update");
  const { issue_date, due_date } = body.data;
  if (issue_date && due_date && due_date < issue_date) return fail("VALIDATION_ERROR", "due_date cannot be earlier than issue_date");

  const { data, error } = await updateDraftInvoice(auth.ctx.supabase, id, body.data);
  if (error) return paymentErrorResponse(error);
  return ok(data);
}
