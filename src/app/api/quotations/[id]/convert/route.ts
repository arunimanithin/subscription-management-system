import type { NextRequest } from "next/server";
import { authorize, parseBody } from "@/lib/api/guard";
import { ok, fail, fromSupabaseError } from "@/lib/api/respond";
import { convertQuotationSchema } from "@/types/schemas";
import { addInterval, addDays } from "@/lib/billing-period";
import type { ConvertQuotationResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// POST /api/quotations/:id/convert
// Roles: admin, staff
// Body: convertQuotationSchema { start_date, billing_interval, interval_count }
//
// Contract (CONTRACTS.md §4 + §6):
//   - Only 'accepted' quotations can be converted.
//   - Creates a NEW subscription in 'draft' status from the quotation's items.
//   - Quotation items become snapshot subscription_items.
//   - Updates quotation: status → 'converted', subscription_id → new sub id.
//   - Returns { quotation, subscription } (ConvertQuotationResponse).
//   - M2 owns both writes; M3's generate endpoint reads subscriptions (read-only).
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase, profile } = auth.ctx;
  const { id } = await params;

  const body = await parseBody(request, convertQuotationSchema);
  if (!body.ok) return body.response;
  const { start_date, billing_interval, interval_count } = body.data;

  // Fetch the quotation with its items
  const { data: quo, error: fetchError } = await supabase
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

  if (fetchError || !quo) return fail("NOT_FOUND", "Quotation not found");

  if (quo.status !== "accepted") {
    return fail(
      "INVALID_STATE",
      `Only 'accepted' quotations can be converted. This quotation is '${quo.status}'.`,
    );
  }

  // Compute billing dates for the new subscription
  const periodEnd = addInterval(start_date, billing_interval, interval_count);

  // Create the subscription (draft status — activate separately via /transition)
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      customer_id: quo.customer_id,
      currency: quo.currency,
      billing_interval,
      interval_count,
      start_date,
      current_period_start: start_date,
      current_period_end: periodEnd,
      next_billing_date: periodEnd,
      created_by: profile.id,
      // status = 'draft' (DB default) — staff activates it manually
    })
    .select("id, subscription_number")
    .single();

  if (subError || !sub) return fromSupabaseError(subError ?? { message: "Failed to create subscription from quotation" });

  // Copy quotation items → subscription_items (snapshots already stored on quo items)
  const quoItems = quo.items as Array<{
    plan_id: string | null;
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    tax_rate: number;
    sort_order: number;
  }>;

  const subItemRows = quoItems.map((item) => ({
    subscription_id: sub.id,
    plan_id: item.plan_id ?? null,
    product_id: item.product_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    tax_rate: item.tax_rate,
    sort_order: item.sort_order,
  }));

  const { error: subItemsError } = await supabase.from("subscription_items").insert(subItemRows);
  if (subItemsError) {
    // Roll back subscription
    await supabase.from("subscriptions").delete().eq("id", sub.id);
    return fromSupabaseError(subItemsError);
  }

  // Mark the quotation as converted and link to new subscription
  const { error: quoUpdateError } = await supabase
    .from("quotations")
    .update({ status: "converted", subscription_id: sub.id })
    .eq("id", id);

  if (quoUpdateError) {
    // Roll back subscription and its items (cascade will remove items)
    await supabase.from("subscriptions").delete().eq("id", sub.id);
    return fromSupabaseError(quoUpdateError);
  }

  // Fetch the final full shapes for both entities
  const [{ data: finalQuo, error: quoFetchErr }, { data: finalSub, error: subFetchErr }] =
    await Promise.all([
      supabase
        .from("quotations")
        .select("*, customer:customers!inner(id, name, email, company), items:quotation_items(*)")
        .eq("id", id)
        .single(),
      supabase
        .from("subscriptions")
        .select("*, customer:customers!inner(id, name, email, company), items:subscription_items(*)")
        .eq("id", sub.id)
        .single(),
    ]);

  if (quoFetchErr || !finalQuo) return fromSupabaseError(quoFetchErr ?? { message: "Failed to fetch converted quotation" });
  if (subFetchErr || !finalSub) return fromSupabaseError(subFetchErr ?? { message: "Failed to fetch created subscription" });

  return ok<ConvertQuotationResponse["data"]>(
    {
      quotation: finalQuo,
      subscription: finalSub,
    },
    201,
  );
}
