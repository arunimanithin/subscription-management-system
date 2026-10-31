import type { NextRequest } from "next/server";
import { authorize, parseBody } from "@/lib/api/guard";
import { ok, fail, fromSupabaseError } from "@/lib/api/respond";
import { subscriptionTransitionSchema } from "@/types/schemas";
import { addInterval, addDays, todayISO } from "@/lib/billing-period";
import type { SubscriptionDetail } from "@/types/api";
import type { SubscriptionStatus } from "@/types/enums";

// ---------------------------------------------------------------------------
// POST /api/subscriptions/:id/transition
// Roles: admin, staff
// Body: { action: activate|pause|resume|cancel, at_period_end?: boolean }
//
// Allowed transitions (CONTRACTS.md §3):
//   activate : draft          → trialing (trial_end_date set) | active
//   pause    : active|trialing → paused
//   resume   : paused          → active
//   cancel   : any live state  → cancelled (immediately or at_period_end)
//
// M3 also calls this endpoint to set past_due — handled via direct DB update
// in their own flow; this handler covers only the four staff-facing actions.
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;
  const { id } = await params;

  const body = await parseBody(request, subscriptionTransitionSchema);
  if (!body.ok) return body.response;
  const { action, at_period_end } = body.data;

  // Fetch the current subscription (RLS enforces staff-only access)
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, status, billing_interval, interval_count, start_date, trial_end_date, cancel_at_period_end")
    .eq("id", id)
    .single();

  if (fetchError || !sub) return fail("NOT_FOUND", "Subscription not found");

  const now = new Date().toISOString();
  const today = todayISO();
  const currentStatus = sub.status as SubscriptionStatus;
  let patch: Record<string, unknown> = {};

  switch (action) {
    case "activate": {
      if (currentStatus !== "draft") {
        return fail("INVALID_STATE", `Cannot activate a subscription in '${currentStatus}' status. Only 'draft' subscriptions can be activated.`);
      }
      // Determine if a trial period applies
      const trialEnd = sub.trial_end_date as string | null;
      const newStatus: SubscriptionStatus = trialEnd ? "trialing" : "active";
      const periodStart = today;
      const periodEnd = addInterval(today, sub.billing_interval, sub.interval_count);
      // next_billing_date: after trial if trialing, otherwise after the first period
      const nextBilling = trialEnd ? addDays(trialEnd, 1) : periodEnd;

      patch = {
        status: newStatus,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        next_billing_date: nextBilling,
      };
      break;
    }

    case "pause": {
      const pauseableStatuses: SubscriptionStatus[] = ["active", "trialing"];
      if (!pauseableStatuses.includes(currentStatus)) {
        return fail("INVALID_STATE", `Cannot pause a subscription in '${currentStatus}' status. Must be 'active' or 'trialing'.`);
      }
      patch = { status: "paused", paused_at: now };
      break;
    }

    case "resume": {
      if (currentStatus !== "paused") {
        return fail("INVALID_STATE", `Cannot resume a subscription in '${currentStatus}' status. Only 'paused' subscriptions can be resumed.`);
      }
      patch = { status: "active", paused_at: null };
      break;
    }

    case "cancel": {
      const liveStatuses: SubscriptionStatus[] = ["draft", "trialing", "active", "paused", "past_due"];
      if (!liveStatuses.includes(currentStatus)) {
        return fail("INVALID_STATE", `Cannot cancel a subscription in '${currentStatus}' status.`);
      }
      if (at_period_end) {
        // Soft cancel: mark for cancellation at the end of the current period
        patch = { cancel_at_period_end: true };
      } else {
        // Immediate cancel
        patch = {
          status: "cancelled",
          cancelled_at: now,
          ended_at: now,
          cancel_at_period_end: false,
        };
      }
      break;
    }

    default:
      return fail("VALIDATION_ERROR", `Unknown action: ${action}`);
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("id", id);

  if (updateError) return fromSupabaseError(updateError);

  // Re-fetch the full SubscriptionDetail
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
