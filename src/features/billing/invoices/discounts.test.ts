import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcLine, calcTotals } from "@/lib/money";
import { invoiceTransitionSchema, createInvoiceSchema } from "@/types/schemas";
import { buildInvoicePayload } from "./build-invoice";

describe("fixed-amount discounts", () => {
  it("takes a fixed amount off the whole line before tax", () => {
    const l = calcLine({ quantity: 2, unit_price: 1000, discount_amount: 250, tax_rate: 18 });
    assert.deepEqual(l, { gross: 2000, discount_amount: 250, taxable: 1750, tax_amount: 315, line_total: 2065 });
  });
  it("caps the fixed discount at the line amount (never negative)", () => {
    const l = calcLine({ quantity: 1, unit_price: 100, discount_amount: 500, tax_rate: 18 });
    assert.equal(l.line_total, 0);
    assert.equal(l.discount_amount, 100);
  });
  it("document totals stay consistent when lines mix percent and fixed discounts", () => {
    const t = calcTotals([
      { quantity: 1, unit_price: 999.99, discount_percent: 15, tax_rate: 18 },
      { quantity: 3, unit_price: 49.5, discount_amount: 20, tax_rate: 5 },
    ]);
    assert.equal(t.total, Math.round((t.subtotal - t.discount_total + t.tax_total) * 100) / 100);
  });
  it("invoice payload carries the fixed discount amount and matching header totals", () => {
    const { items, totals } = buildInvoicePayload(
      createInvoiceSchema.parse({
        customer_id: "3f2b8a52-6c1e-4f0e-9a55-0d8f2b6c1a11",
        issue_date: "2026-10-31",
        due_date: "2026-11-14",
        items: [{ description: "Setup", quantity: 1, unit_price: 500, discount_amount: 50, tax_rate: 18 }],
      }),
    );
    assert.equal(items[0].discount_amount, 50);
    assert.equal(totals.discount_total, 50);
    assert.equal(totals.total, 531);
  });
});

describe("invoice schemas (Part 3)", () => {
  const base = { customer_id: "3f2b8a52-6c1e-4f0e-9a55-0d8f2b6c1a11", issue_date: "2026-10-31", due_date: "2026-11-14" };
  it("rejects both a percentage and a fixed discount on one line", () => {
    const r = createInvoiceSchema.safeParse({ ...base, items: [{ description: "x", quantity: 1, unit_price: 100, discount_percent: 10, discount_amount: 5 }] });
    assert.equal(r.success, false);
  });
  it("rejects a fixed discount larger than the line amount", () => {
    const r = createInvoiceSchema.safeParse({ ...base, items: [{ description: "x", quantity: 1, unit_price: 100, discount_amount: 150 }] });
    assert.equal(r.success, false);
  });
  it("transition accepts issue and void (with reason) but nothing else", () => {
    assert.equal(invoiceTransitionSchema.safeParse({ action: "issue" }).success, true);
    assert.equal(invoiceTransitionSchema.safeParse({ action: "void", reason: "duplicate" }).success, true);
    assert.equal(invoiceTransitionSchema.safeParse({ action: "delete" }).success, false);
  });
});
