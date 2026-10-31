import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcLine, calcTotals } from "@/lib/money";
import { createInvoiceSchema } from "@/types/schemas";
import { buildInvoicePayload } from "./build-invoice";

const CUSTOMER = "11111111-1111-4111-8111-111111111111";
const PLAN = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "33333333-3333-4333-8333-333333333333";

const parse = (items: unknown[]) =>
  createInvoiceSchema.parse({ customer_id: CUSTOMER, issue_date: "2026-10-31", due_date: "2026-11-14", items });

describe("calculation order: gross -> discount -> tax on discounted amount", () => {
  it("applies discount before tax", () => {
    const l = calcLine({ quantity: 2, unit_price: 1000, discount_percent: 10, tax_rate: 18 });
    assert.deepEqual(l, { gross: 2000, discount_amount: 200, taxable: 1800, tax_amount: 324, line_total: 2124 });
  });
  it("treats missing discount and tax as zero", () => {
    assert.equal(calcLine({ quantity: 3, unit_price: 10 }).line_total, 30);
  });
  it("handles a 100% discount (free line, no tax)", () => {
    const l = calcLine({ quantity: 1, unit_price: 500, discount_percent: 100, tax_rate: 18 });
    assert.equal(l.line_total, 0);
    assert.equal(l.tax_amount, 0);
  });
  it("handles a zero price", () => {
    assert.equal(calcLine({ quantity: 5, unit_price: 0, tax_rate: 18 }).line_total, 0);
  });
});

describe("rounding", () => {
  it("rounds half-cents per line (971.676 -> 971.68)", () => {
    assert.equal(calcLine({ quantity: 2, unit_price: 2999, discount_percent: 10, tax_rate: 18 }).tax_amount, 971.68);
  });
  it("avoids floating point drift (0.1 x 3)", () => {
    assert.equal(calcLine({ quantity: 3, unit_price: 0.1 }).gross, 0.3);
  });
  it("document totals equal the sum of rounded lines and satisfy total = subtotal - discount + tax", () => {
    const lines = [
      { quantity: 3, unit_price: 0.1, tax_rate: 18 },
      { quantity: 1, unit_price: 33.33, discount_percent: 33.33, tax_rate: 5 },
      { quantity: 0.5, unit_price: 19.99 },
    ];
    const t = calcTotals(lines);
    const sum = lines.map(calcLine).reduce((a, l) => a + l.line_total, 0);
    assert.equal(t.total, Math.round(sum * 100) / 100);
    assert.equal(Math.round((t.subtotal - t.discount_total + t.tax_total) * 100) / 100, t.total);
  });
  it("handles large amounts without losing cents", () => {
    assert.equal(calcLine({ quantity: 1000, unit_price: 99999.99, tax_rate: 18 }).line_total, 117999988.2);
  });
});

describe("buildInvoicePayload", () => {
  it("copies description, price, discount and tax onto each line (snapshot) and keeps order", () => {
    const { invoice, items } = buildInvoicePayload(
      parse([
        { plan_id: PLAN, product_id: PRODUCT, description: "Pro – Monthly", quantity: 2, unit_price: 1000, discount_percent: 10, tax_rate: 18 },
        { description: "Setup", quantity: 1, unit_price: 600 },
      ]),
    );
    assert.equal(items[0].description, "Pro – Monthly");
    assert.equal(items[0].unit_price, 1000);
    assert.equal(items[0].plan_id, PLAN);
    assert.equal(items[0].sort_order, 0);
    assert.equal(items[1].plan_id, null);
    assert.equal(items[1].tax_rate, 0);
    assert.equal(items[1].sort_order, 1);
    assert.equal(invoice.total, 2724);
    assert.equal(invoice.subtotal, 2600);
  });
  it("header totals always equal the sum of line amounts", () => {
    const { invoice, items } = buildInvoicePayload(
      parse([
        { description: "A", quantity: 3, unit_price: 0.1, tax_rate: 18 },
        { description: "B", quantity: 7, unit_price: 12.345, discount_percent: 12.5, tax_rate: 12 },
      ]),
    );
    const r = (n: number) => Math.round(n * 100) / 100;
    assert.equal(invoice.total, r(items.reduce((a, i) => a + i.line_total, 0)));
    assert.equal(invoice.tax_total, r(items.reduce((a, i) => a + i.tax_amount, 0)));
    assert.equal(invoice.discount_total, r(items.reduce((a, i) => a + i.discount_amount, 0)));
  });
});

describe("input validation (shared Zod schema)", () => {
  const base = { customer_id: CUSTOMER, issue_date: "2026-10-31", due_date: "2026-11-14" };
  const line = { description: "x", quantity: 1, unit_price: 1 };
  const rejects = (name: string, body: object) =>
    it(`rejects ${name}`, () => assert.equal(createInvoiceSchema.safeParse(body).success, false));

  rejects("an empty item list", { ...base, items: [] });
  rejects("quantity 0", { ...base, items: [{ ...line, quantity: 0 }] });
  rejects("a negative price", { ...base, items: [{ ...line, unit_price: -1 }] });
  rejects("a negative discount", { ...base, items: [{ ...line, discount_percent: -1 }] });
  rejects("discount over 100%", { ...base, items: [{ ...line, discount_percent: 101 }] });
  rejects("tax over 100%", { ...base, items: [{ ...line, tax_rate: 101 }] });
  rejects("a non-uuid customer", { ...base, customer_id: "abc", items: [line] });
  rejects("a badly formatted date", { ...base, due_date: "14/11/2026", items: [line] });
  rejects("an empty description", { ...base, items: [{ ...line, description: "  " }] });
});
