import assert from "node:assert/strict";
import { test } from "node:test";
import { createPaymentSchema } from "@/types/schemas";

const base = { invoice_id: "3f2b8a52-6c1e-4f0e-9a55-0d8f2b6c1a11", amount: 100, method: "upi" };

test("payment schema accepts a valid payment", () => {
  assert.equal(createPaymentSchema.safeParse(base).success, true);
});
test("payment schema rejects zero / negative amounts", () => {
  assert.equal(createPaymentSchema.safeParse({ ...base, amount: 0 }).success, false);
  assert.equal(createPaymentSchema.safeParse({ ...base, amount: -5 }).success, false);
});
test("payment schema rejects unknown method and short idempotency key", () => {
  assert.equal(createPaymentSchema.safeParse({ ...base, method: "bitcoin" }).success, false);
  assert.equal(createPaymentSchema.safeParse({ ...base, idempotency_key: "short" }).success, false);
  assert.equal(createPaymentSchema.safeParse({ ...base, idempotency_key: "abcdefgh-1234" }).success, true);
});
