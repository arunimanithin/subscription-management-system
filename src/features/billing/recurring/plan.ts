import { addDays, addInterval } from "@/lib/billing-period";
import type { Subscription, SubscriptionItem } from "@/types/entities";
import { buildInvoicePayload } from "@/features/billing/invoices/build-invoice";
import type { CreateInvoiceInput } from "@/features/billing/invoices/types";

/** Payment terms for generated invoices: due 14 days after the issue date. */
export const RECURRING_PAYMENT_TERMS_DAYS = 14;

/** Statuses that are billed. Trialing subscriptions are not charged until they become active. */
export const BILLABLE_STATUSES = ["active", "past_due"] as const;

export type SkipReason = "not_billable" | "not_due" | "cancel_at_period_end" | "no_items" | "zero_total";

export type BillingPlan =
  | {
      ok: true;
      period_start: string;
      period_end: string;
      next_billing_date: string;
      payload: ReturnType<typeof buildInvoicePayload>;
    }
  | { ok: false; reason: SkipReason; message: string };

/**
 * Pure function: decides whether a subscription should be billed today and, if so, for which
 * period and for how much. No I/O, so every rule is unit-tested.
 *
 * Convention (also in CONTRACTS.md): a period is billed IN ADVANCE and starts on
 * next_billing_date (falling back to current_period_start, then start_date). Dates are inclusive:
 *   period_end        = period_start + interval − 1 day
 *   next_billing_date = period_start + interval
 * One period is billed per call; a subscription that is several periods behind catches up one
 * period per run.
 */
export function planBilling(sub: Subscription, items: SubscriptionItem[], issueDate: string): BillingPlan {
  if (!(BILLABLE_STATUSES as readonly string[]).includes(sub.status)) {
    return { ok: false, reason: "not_billable", message: `A ${sub.status.replace(/_/g, " ")} subscription is not billed` };
  }

  const periodStart = sub.next_billing_date ?? sub.current_period_start ?? sub.start_date;
  if (periodStart > issueDate) {
    return { ok: false, reason: "not_due", message: `Not due until ${periodStart}` };
  }

  // Cancelling at period end: the current period was already billed, so there is nothing left to bill.
  if (sub.cancel_at_period_end && sub.current_period_end && periodStart > sub.current_period_end) {
    return { ok: false, reason: "cancel_at_period_end", message: "Subscription is set to cancel at the end of the current period" };
  }

  if (items.length === 0) {
    return { ok: false, reason: "no_items", message: "The subscription has no items to bill" };
  }

  const nextBilling = addInterval(periodStart, sub.billing_interval, sub.interval_count);
  const periodEnd = addDays(nextBilling, -1);

  const input: CreateInvoiceInput = {
    customer_id: sub.customer_id,
    subscription_id: sub.id,
    currency: sub.currency,
    issue_date: issueDate,
    due_date: addDays(issueDate, RECURRING_PAYMENT_TERMS_DAYS),
    period_start: periodStart,
    period_end: periodEnd,
    notes: `Subscription ${sub.subscription_number}: ${periodStart} to ${periodEnd}`,
    // Snapshot rule: copy the subscription item's values onto the invoice line now.
    items: [...items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        plan_id: i.plan_id,
        product_id: i.product_id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent,
        discount_amount: 0,
        tax_rate: i.tax_rate,
      })),
  };
  const payload = buildInvoicePayload(input);
  if (payload.totals.total <= 0) {
    return { ok: false, reason: "zero_total", message: "The invoice total would be zero, so no invoice was created" };
  }
  return { ok: true, period_start: periodStart, period_end: periodEnd, next_billing_date: nextBilling, payload };
}
