import type { NextRequest } from "next/server";
import { authorize, parseBody, parseQuery } from "@/lib/api/guard";
import { ok, list, fromSupabaseError, toRange } from "@/lib/api/respond";
import { listQuerySchema, createSubscriptionSchema } from "@/types/schemas";
import { addDays } from "@/lib/billing-period";
import type { SubscriptionDetail } from "@/types/api";

// ---------------------------------------------------------------------------
// GET /api/subscriptions
// Roles: admin, staff, customer (customers see only their own via RLS)
// Query: page, page_size, search (subscription_number or customer name), status
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await authorize(["admin", "staff", "customer"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;

  const query = parseQuery(request, listQuerySchema);
  if (!query.ok) return query.response;
  const { page, page_size, search, status } = query.data;
  const [from, to] = toRange(page, page_size);

  // Build base query: join customer snapshot and items
  let q = supabase
    .from("subscriptions")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:subscription_items(*)
      `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    q = q.eq("status", status);
  }

  if (search) {
    const pattern = `%${search}%`;
    q = q.or(`subscription_number.ilike.${pattern},customer.name.ilike.${pattern}`);
  }

  const { data, error, count } = await q;

  if (error) return fromSupabaseError(error);

  return list<SubscriptionDetail>(data as SubscriptionDetail[], {
    page,
    page_size,
    total: count ?? 0,
  });
}

// ---------------------------------------------------------------------------
// POST /api/subscriptions
// Roles: admin, staff
// Body: createSubscriptionSchema (customer_id, billing_interval, interval_count,
//       start_date, trial_days, notes, items[])
// Items are stored as snapshots – values come directly from the request body;
// the caller is responsible for copying plan prices before submitting.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase, profile } = auth.ctx;

  const body = await parseBody(request, createSubscriptionSchema);
  if (!body.ok) return body.response;
  const { customer_id, currency, billing_interval, interval_count, start_date, trial_days, notes, items } =
    body.data;

  // Compute trial_end_date when trial_days > 0
  const trial_end_date: string | null = trial_days > 0 ? addDays(start_date, trial_days) : null;

  // Insert the subscription header
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      customer_id,
      currency,
      billing_interval,
      interval_count,
      start_date,
      trial_end_date,
      notes: notes ?? null,
      created_by: profile.id,
      // status defaults to 'draft' per DB constraint
    })
    .select("id, subscription_number")
    .single();

  if (subError || !sub) return fromSupabaseError(subError ?? { message: "Failed to create subscription" });

  // Insert snapshot items
  const itemRows = items.map((item, idx) => ({
    subscription_id: sub.id,
    plan_id: item.plan_id ?? null,
    product_id: item.product_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent ?? 0,
    tax_rate: item.tax_rate ?? 0,
    sort_order: idx,
  }));

  const { error: itemsError } = await supabase.from("subscription_items").insert(itemRows);
  if (itemsError) {
    // Roll back the subscription header to keep DB consistent
    await supabase.from("subscriptions").delete().eq("id", sub.id);
    return fromSupabaseError(itemsError);
  }

  // Re-fetch the full SubscriptionDetail to return the canonical shape
  const { data: full, error: fetchError } = await supabase
    .from("subscriptions")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:subscription_items(*)
      `,
    )
    .eq("id", sub.id)
    .single();

  if (fetchError || !full) return fromSupabaseError(fetchError ?? { message: "Failed to fetch created subscription" });

  return ok<SubscriptionDetail>(full as SubscriptionDetail, 201);
}
