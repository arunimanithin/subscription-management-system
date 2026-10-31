import type { NextRequest } from "next/server";
import { authorize } from "@/lib/api/guard";
import { ok, fail, fromSupabaseError } from "@/lib/api/respond";
import { addInterval } from "@/lib/billing-period";
import type { SubscriptionDetail } from "@/types/api";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;
  const { id } = await params;

  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select(
      "id, status, billing_interval, interval_count, start_date, current_period_start, current_period_end, next_billing_date, cancel_at_period_end, paused_at",
    )
    .eq("id", id)
    .single();

  if (fetchError || !sub) return fail("NOT_FOUND", "Subscription not found");

  const currentStatus = sub.status as string;
  if (["draft", "cancelled", "expired"].includes(currentStatus)) {
    return fail("INVALID_STATE", `Subscription cannot be renewed from '${currentStatus}' status.`);
  }

  const basePeriodStart = sub.current_period_start ?? sub.start_date;
  const currentPeriodEnd = sub.current_period_end ?? basePeriodStart;
  const currentNextBillingDate = sub.next_billing_date ?? currentPeriodEnd;

  const nextPeriodStart = currentPeriodEnd;
  const nextPeriodEnd = addInterval(currentPeriodEnd, sub.billing_interval, sub.interval_count);
  const nextBillingDate = nextPeriodEnd;

  const { data: renewed, error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: currentStatus === "paused" ? "active" : currentStatus,
      current_period_start: nextPeriodStart,
      current_period_end: nextPeriodEnd,
      next_billing_date: nextBillingDate,
      cancelled_at: null,
      ended_at: null,
      cancel_at_period_end: false,
      paused_at: null,
    })
    .eq("id", id)
    .eq("status", currentStatus)
    .eq("current_period_end", currentPeriodEnd)
    .eq("next_billing_date", currentNextBillingDate)
    .select("id");

  if (updateError) return fromSupabaseError(updateError);
  if (!renewed || renewed.length === 0) {
    return fail("CONFLICT", "This subscription has already been renewed for the current billing cycle.");
  }

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

  if (fullFetchError || !full) return fromSupabaseError(fullFetchError ?? { message: "Failed to fetch renewed subscription" });

  return ok<SubscriptionDetail>(full as SubscriptionDetail);
}
