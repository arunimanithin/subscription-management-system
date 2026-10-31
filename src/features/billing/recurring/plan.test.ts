import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription, SubscriptionItem } from "@/types/entities";
import { planBilling } from "./plan";

const sub = (o: Partial<Subscription> = {}): Subscription => ({
  id: "sub-1",
  subscription_number: "SUB-000001",
  customer_id: "cust-1",
  status: "active",
  currency: "INR",
  billing_interval: "month",
  interval_count: 1,
  start_date: "2026-10-01",
  trial_end_date: null,
  current_period_start: "2026-10-01",
  current_period_end: "2026-10-31",
  next_billing_date: "2026-11-01",
  cancel_at_period_end: false,
  paused_at: null,
  cancelled_at: null,
  ended_at: null,
  notes: null,
  created_by: null,
  created_at: "",
  updated_at: "",
  ...o,
});
const item = (o: Partial<SubscriptionItem> = {}): SubscriptionItem => ({
  id: "i1",
  subscription_id: "sub-1",
  plan_id: "plan-1",
  product_id: "prod-1",
  description: "Analytics Suite – Team (monthly)",
  quantity: 1,
  unit_price: 2999,
  discount_percent: 10,
  tax_rate: 18,
  sort_order: 0,
  created_at: "",
  updated_at: "",
  ...o,
});

function ok(p: ReturnType<typeof planBilling>) {
  assert.equal(p.ok, true, p.ok ? "" : p.message);
  if (!p.ok) throw new Error("unreachable");
  return p;
}
function skipped(p: ReturnType<typeof planBilling>) {
  assert.equal(p.ok, false);
  if (p.ok) throw new Error("unreachable");
  return p;
}

describe("planBilling – period and dates", () => {
  it("bills the period starting on next_billing_date (inclusive end, next date = following period start)", () => {
    const p = ok(planBilling(sub(), [item()], "2026-11-01"));
    assert.equal(p.period_start, "2026-11-01");
    assert.equal(p.period_end, "2026-11-30");
    assert.equal(p.next_billing_date, "2026-12-01");
  });
  it("is due on the billing date and after it, not before", () => {
    assert.equal(skipped(planBilling(sub(), [item()], "2026-10-31")).reason, "not_due");
    ok(planBilling(sub(), [item()], "2026-11-01"));
    ok(planBilling(sub(), [item()], "2026-11-20")); // late run still bills that period
  });
  it("falls back to current_period_start, then start_date, when next_billing_date is empty", () => {
    assert.equal(ok(planBilling(sub({ next_billing_date: null }), [item()], "2026-11-05")).period_start, "2026-10-01");
    assert.equal(ok(planBilling(sub({ next_billing_date: null, current_period_start: null }), [item()], "2026-11-05")).period_start, "2026-10-01");
  });
  it("handles weekly, quarterly, yearly and multi-count intervals", () => {
    const w = ok(planBilling(sub({ billing_interval: "week", next_billing_date: "2026-11-02" }), [item()], "2026-11-02"));
    assert.deepEqual([w.period_end, w.next_billing_date], ["2026-11-08", "2026-11-09"]);
    const q = ok(planBilling(sub({ billing_interval: "quarter", next_billing_date: "2026-11-01" }), [item()], "2026-11-01"));
    assert.deepEqual([q.period_end, q.next_billing_date], ["2027-01-31", "2027-02-01"]);
    const y = ok(planBilling(sub({ billing_interval: "year", next_billing_date: "2026-11-01" }), [item()], "2026-11-01"));
    assert.deepEqual([y.period_end, y.next_billing_date], ["2027-10-31", "2027-11-01"]);
    const m2 = ok(planBilling(sub({ interval_count: 2, next_billing_date: "2026-11-01" }), [item()], "2026-11-01"));
    assert.deepEqual([m2.period_end, m2.next_billing_date], ["2026-12-31", "2027-01-01"]);
  });
  it("clamps month ends (31 Jan + 1 month = 28 Feb)", () => {
    const p = ok(planBilling(sub({ next_billing_date: "2026-01-31" }), [item()], "2026-01-31"));
    assert.deepEqual([p.period_end, p.next_billing_date], ["2026-02-27", "2026-02-28"]);
  });
});

describe("planBilling – which subscriptions are billed", () => {
  it("bills active and past_due", () => {
    ok(planBilling(sub({ status: "active" }), [item()], "2026-11-01"));
    ok(planBilling(sub({ status: "past_due" }), [item()], "2026-11-01"));
  });
  it("does not bill draft, trialing, paused, cancelled or expired subscriptions", () => {
    for (const status of ["draft", "trialing", "paused", "cancelled", "expired"] as const) {
      assert.equal(skipped(planBilling(sub({ status }), [item()], "2026-11-01")).reason, "not_billable", status);
    }
  });
  it("skips a subscription set to cancel at period end once its current period is billed", () => {
    const s = sub({ cancel_at_period_end: true, current_period_start: "2026-10-01", current_period_end: "2026-10-31", next_billing_date: "2026-11-01" });
    assert.equal(skipped(planBilling(s, [item()], "2026-11-01")).reason, "cancel_at_period_end");
  });
  it("still bills the first period of a subscription that is already set to cancel at period end", () => {
    const s = sub({ cancel_at_period_end: true, current_period_start: "2026-10-01", current_period_end: "2026-10-31", next_billing_date: "2026-10-01" });
    ok(planBilling(s, [item()], "2026-10-01"));
  });
  it("skips subscriptions with no items or a zero total", () => {
    assert.equal(skipped(planBilling(sub(), [], "2026-11-01")).reason, "no_items");
    assert.equal(skipped(planBilling(sub(), [item({ unit_price: 0 })], "2026-11-01")).reason, "zero_total");
  });
});

describe("planBilling – the invoice it builds", () => {
  it("links the subscription, snapshots the item values and uses the shared calculation", () => {
    const p = ok(planBilling(sub(), [item()], "2026-11-01"));
    assert.equal(p.payload.invoice.subscription_id, "sub-1");
    assert.equal(p.payload.invoice.customer_id, "cust-1");
    assert.equal(p.payload.invoice.period_start, "2026-11-01");
    assert.equal(p.payload.invoice.period_end, "2026-11-30");
    // 2999 − 10% (299.90) = 2699.10; + 18% tax (485.84) = 3184.94 – same numbers as the manual invoice
    assert.deepEqual(
      [p.payload.totals.subtotal, p.payload.totals.discount_total, p.payload.totals.tax_total, p.payload.totals.total],
      [2999, 299.9, 485.84, 3184.94],
    );
    const line = p.payload.items[0];
    assert.equal(line.description, "Analytics Suite – Team (monthly)");
    assert.equal(line.unit_price, 2999);
    assert.equal(line.plan_id, "plan-1");
  });
  it("sets issue date and a 14-day due date", () => {
    const p = ok(planBilling(sub(), [item()], "2026-11-03"));
    assert.equal(p.payload.invoice.issue_date, "2026-11-03");
    assert.equal(p.payload.invoice.due_date, "2026-11-17");
  });
  it("keeps line order and sums several items", () => {
    const p = ok(planBilling(sub(), [item({ id: "b", description: "B", sort_order: 1, unit_price: 100, discount_percent: 0, tax_rate: 0 }), item({ id: "a", description: "A", sort_order: 0, unit_price: 50, discount_percent: 0, tax_rate: 0 })], "2026-11-01"));
    assert.deepEqual(p.payload.items.map((i) => i.description), ["A", "B"]);
    assert.equal(p.payload.totals.total, 150);
  });
  it("uses the subscription currency", () => {
    assert.equal(ok(planBilling(sub({ currency: "USD" }), [item()], "2026-11-01")).payload.invoice.currency, "USD");
  });
});
