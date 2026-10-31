import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAging, normalizeSummary } from "./normalize";
import { agingQuerySchema, defaultPeriod, summaryQuerySchema } from "./period";

describe("normalizeSummary", () => {
  it("handles an empty database", () => {
    const s = normalizeSummary({ from: null, to: null, as_of: "2026-10-31", currencies: [] });
    assert.deepEqual(s.currencies, []);
    assert.equal(s.as_of, "2026-10-31");
  });

  it("rounds, fills every status and computes the collection rate", () => {
    const s = normalizeSummary({
      as_of: "2026-10-31",
      currencies: [
        {
          currency: "INR",
          billed: "4366.004",
          billed_paid: 1380,
          collected: 1380,
          refunded: 118,
          failed_payments: 1,
          outstanding: 2986,
          open_invoice_count: 4,
          overdue_amount: 2750,
          overdue_count: 2,
          invoices_by_status: { paid: { count: 1, total: 1180 }, overdue: { count: 2, total: 2950 } },
          payments_by_method: [{ method: "upi", count: 1, amount: 1180 }],
          monthly: [{ month: "2026-10-01", billed: 4366, collected: 1380 }],
        },
      ],
    });
    const inr = s.currencies[0];
    assert.equal(inr.billed, 4366);
    assert.equal(inr.collection_rate, 0.3161); // 1380 / 4366
    assert.deepEqual(inr.invoices_by_status.draft, { count: 0, total: 0 });
    assert.deepEqual(inr.invoices_by_status.overdue, { count: 2, total: 2950 });
    assert.equal(Object.keys(inr.invoices_by_status).length, 6);
  });

  it("collection rate is null (not NaN) when nothing was billed", () => {
    const s = normalizeSummary({ as_of: "x", currencies: [{ currency: "INR", billed: 0, billed_paid: 0 }] });
    assert.equal(s.currencies[0].collection_rate, null);
    assert.equal(s.currencies[0].collected, 0);
    assert.deepEqual(s.currencies[0].monthly, []);
  });
});

describe("normalizeAging", () => {
  it("always returns the five buckets in order", () => {
    const a = normalizeAging({
      as_of: "2026-10-31",
      currencies: [{ currency: "INR", total_outstanding: 100, total_overdue: 60, buckets: [{ bucket: "31-60", count: 1, amount: 60 }, { bucket: "current", count: 1, amount: 40 }], top_overdue_customers: [] }],
    });
    assert.deepEqual(a.currencies[0].buckets.map((b) => b.bucket), ["current", "1-30", "31-60", "61-90", "90+"]);
    assert.equal(a.currencies[0].buckets[2].amount, 60);
    assert.equal(a.currencies[0].buckets[1].count, 0);
  });
});

describe("report query validation", () => {
  it("accepts valid dates and ranges", () => {
    assert.ok(summaryQuerySchema.safeParse({ from: "2026-01-01", to: "2026-10-31" }).success);
    assert.ok(summaryQuerySchema.safeParse({}).success);
    assert.ok(summaryQuerySchema.safeParse({ from: "2026-10-31", to: "2026-10-31" }).success);
  });
  it("rejects from after to, bad formats and impossible dates", () => {
    assert.ok(!summaryQuerySchema.safeParse({ from: "2026-11-01", to: "2026-10-31" }).success);
    assert.ok(!summaryQuerySchema.safeParse({ from: "31/10/2026" }).success);
    assert.ok(!summaryQuerySchema.safeParse({ to: "2026-02-30" }).success);
    assert.ok(!agingQuerySchema.safeParse({ as_of: "2026-13-01" }).success);
    assert.ok(agingQuerySchema.safeParse({ as_of: "2026-10-31" }).success);
  });
  it("default period is the current month plus the 11 before it", () => {
    assert.deepEqual(defaultPeriod(new Date("2026-10-31T10:00:00Z")), { from: "2025-11-01", to: "2026-10-31" });
    assert.deepEqual(defaultPeriod(new Date("2026-03-15T00:00:00Z")), { from: "2025-04-01", to: "2026-03-15" });
    assert.deepEqual(defaultPeriod(new Date("2026-01-01T00:00:00Z")), { from: "2025-02-01", to: "2026-01-01" });
  });
});
