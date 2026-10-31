import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorize, parseBody } from "@/lib/api/guard";
import { ok, fail, fromSupabaseError } from "@/lib/api/respond";
import { updateQuotationSchema } from "@/types/schemas";
import { calcLine, calcTotals } from "@/lib/money";
import type { QuotationDetail } from "@/types/api";

// Shared helper to fetch a full QuotationDetail
async function fetchQuotationDetail(supabase: SupabaseClient, id: string) {
  return supabase
    .from("quotations")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:quotation_items(*)
      `,
    )
    .eq("id", id)
    .single();
}

// ---------------------------------------------------------------------------
// GET /api/quotations/:id
// Roles: admin, staff, customer (RLS hides drafts from customers)
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff", "customer"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;
  const { id } = await params;

  const { data, error } = await fetchQuotationDetail(supabase, id);

  if (error) return fromSupabaseError(error);
  if (!data) return fail("NOT_FOUND", "Quotation not found");

  return ok<QuotationDetail>(data as QuotationDetail);
}

// ---------------------------------------------------------------------------
// PATCH /api/quotations/:id
// Roles: admin, staff
// Only DRAFT quotations may be edited; any other status → INVALID_STATE.
// Recalculates totals if items are included.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;
  const { id } = await params;

  const body = await parseBody(request, updateQuotationSchema);
  if (!body.ok) return body.response;
  const { customer_id, currency, valid_until, notes, terms, items } = body.data;

  // Verify it exists and is still a draft
  const { data: existing, error: fetchError } = await supabase
    .from("quotations")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return fail("NOT_FOUND", "Quotation not found");
  if (existing.status !== "draft") {
    return fail("INVALID_STATE", `Only draft quotations can be edited. This quotation is '${existing.status}'.`);
  }

  // Build header patch
  const headerUpdate: Record<string, unknown> = {};
  if (customer_id !== undefined) headerUpdate.customer_id = customer_id;
  if (currency !== undefined) headerUpdate.currency = currency;
  if (valid_until !== undefined) headerUpdate.valid_until = valid_until ?? null;
  if (notes !== undefined) headerUpdate.notes = notes ?? null;
  if (terms !== undefined) headerUpdate.terms = terms ?? null;

  // If items are provided, recalculate totals and replace
  if (items && items.length > 0) {
    const { subtotal, discount_total, tax_total, total } = calcTotals(items);
    headerUpdate.subtotal = subtotal;
    headerUpdate.discount_total = discount_total;
    headerUpdate.tax_total = tax_total;
    headerUpdate.total = total;

    // Delete old items
    const { error: deleteError } = await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", id);
    if (deleteError) return fromSupabaseError(deleteError);

    // Insert new items with computed amounts
    const itemRows = items.map((item, idx) => {
      const { discount_amount, tax_amount, line_total } = calcLine(item);
      return {
        quotation_id: id,
        plan_id: item.plan_id ?? null,
        product_id: item.product_id ?? null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent ?? 0,
        tax_rate: item.tax_rate ?? 0,
        discount_amount,
        tax_amount,
        line_total,
        sort_order: idx,
      };
    });

    const { error: insertError } = await supabase.from("quotation_items").insert(itemRows);
    if (insertError) return fromSupabaseError(insertError);
  }

  if (Object.keys(headerUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from("quotations")
      .update(headerUpdate)
      .eq("id", id);
    if (updateError) return fromSupabaseError(updateError);
  }

  const { data: full, error: fullFetchError } = await fetchQuotationDetail(supabase, id);
  if (fullFetchError || !full) return fromSupabaseError(fullFetchError ?? { message: "Failed to fetch updated quotation" });

  return ok<QuotationDetail>(full as QuotationDetail);
}
