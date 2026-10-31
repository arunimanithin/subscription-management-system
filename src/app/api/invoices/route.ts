import type { NextRequest } from "next/server";
import { authorize, parseBody, parseQuery } from "@/lib/api/guard";
import { fail, fromSupabaseError, list, ok } from "@/lib/api/respond";
import { createInvoice, listInvoices } from "@/features/billing/invoices/service";
import { INVOICE_STATUSES } from "@/types/enums";
import { createInvoiceSchema, listQuerySchema } from "@/types/schemas";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/** GET /api/invoices – admin/staff see all; customers see only their own non-draft invoices (RLS). */
export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const query = parseQuery(request, listQuerySchema);
  if (!query.ok) return query.response;

  const { status } = query.data;
  if (status && !(INVOICE_STATUSES as readonly string[]).includes(status)) {
    return fail("VALIDATION_ERROR", `status must be one of: ${INVOICE_STATUSES.join(", ")}`);
  }

  const { data, error } = await listInvoices(auth.ctx.supabase, query.data);
  if (error) return fromSupabaseError(error);
  return list(data.rows, { page: query.data.page, page_size: query.data.page_size, total: data.total });
}

/** POST /api/invoices – admin/staff create a draft invoice. Amounts are computed server-side. */
export async function POST(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const body = await parseBody(request, createInvoiceSchema);
  if (!body.ok) return body.response;

  if (body.data.due_date < body.data.issue_date) {
    return fail("VALIDATION_ERROR", "due_date cannot be earlier than issue_date");
  }
  if (body.data.period_start && body.data.period_end && body.data.period_end < body.data.period_start) {
    return fail("VALIDATION_ERROR", "period_end cannot be earlier than period_start");
  }

  const { data, error } = await createInvoice(auth.ctx.supabase, body.data);
  if (error) return fromSupabaseError(error);
  return ok(data, 201);
}
