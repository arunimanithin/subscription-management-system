import type { NextRequest } from "next/server";
import { authorize, parseBody } from "@/lib/api/guard";
import { ok, fail, fromSupabaseError } from "@/lib/api/respond";
import { updateSubscriptionSchema } from "@/types/schemas";
import type { SubscriptionDetail } from "@/types/api";

// ---------------------------------------------------------------------------
// GET /api/subscriptions/:id
// Roles: admin, staff, customer (RLS limits customers to their own)
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff", "customer"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;
  const { id } = await params;

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:subscription_items(*)
      `,
    )
    .eq("id", id)
    .single();

  if (error) return fromSupabaseError(error);
  if (!data) return fail("NOT_FOUND", "Subscription not found");

  return ok<SubscriptionDetail>(data as SubscriptionDetail);
}

// ---------------------------------------------------------------------------
// PATCH /api/subscriptions/:id
// Roles: admin, staff
// Patchable fields: notes, cancel_at_period_end, items (full replace)
// Status and billing fields are changed via /transition, not here.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;
  const { id } = await params;

  const body = await parseBody(request, updateSubscriptionSchema);
  if (!body.ok) return body.response;
  const { notes, cancel_at_period_end, items } = body.data;

  // Verify subscription exists (RLS will block unauthorized access)
  const { data: existing, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return fail("NOT_FOUND", "Subscription not found");

  // Build the header update payload (only defined fields)
  const headerUpdate: Record<string, unknown> = {};
  if (notes !== undefined) headerUpdate.notes = notes ?? null;
  if (cancel_at_period_end !== undefined) headerUpdate.cancel_at_period_end = cancel_at_period_end;

  if (Object.keys(headerUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(headerUpdate)
      .eq("id", id);
    if (updateError) return fromSupabaseError(updateError);
  }

  // If items are provided, do a full replace (delete old → insert new)
  if (items && items.length > 0) {
    const { error: deleteError } = await supabase
      .from("subscription_items")
      .delete()
      .eq("subscription_id", id);
    if (deleteError) return fromSupabaseError(deleteError);

    const itemRows = items.map((item, idx) => ({
      subscription_id: id,
      plan_id: item.plan_id ?? null,
      product_id: item.product_id ?? null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent ?? 0,
      tax_rate: item.tax_rate ?? 0,
      sort_order: idx,
    }));

    const { error: insertError } = await supabase
      .from("subscription_items")
      .insert(itemRows);
    if (insertError) return fromSupabaseError(insertError);
  }

  // Re-fetch the full detail
  const { data: full, error: fullFetchError } = await supabase
    .from("subscriptions")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:subscription_items(*)
      `,
    )
    .eq("id", id)
    .single();

  if (fullFetchError || !full) return fromSupabaseError(fullFetchError ?? { message: "Failed to fetch updated subscription" });

  return ok<SubscriptionDetail>(full as SubscriptionDetail);
}
