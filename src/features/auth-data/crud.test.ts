import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statusFilter } from "./crud";
import { createCustomerSchema, createPlanSchema, createProductSchema, updateCustomerSchema } from "@/types/schemas";

describe("statusFilter", () => {
  it("passes text statuses through and maps active/inactive to booleans", () => {
    assert.equal(statusFilter("text", "inactive"), "inactive");
    assert.equal(statusFilter("boolean", "active"), true);
    assert.equal(statusFilter("boolean", "inactive"), false);
    assert.equal(statusFilter("boolean", "weird"), null);
  });
});

describe("request schemas used by the forms", () => {
  it("customer: name is required, country defaults to IN, bad email rejected", () => {
    assert.equal(createCustomerSchema.safeParse({}).success, false);
    assert.equal(createCustomerSchema.parse({ name: "Aarav" }).country, "IN");
    assert.equal(createCustomerSchema.safeParse({ name: "A", email: "nope" }).success, false);
    assert.deepEqual(updateCustomerSchema.parse({}), {});
  });
  it("product: active by default", () => {
    assert.equal(createProductSchema.parse({ name: "CRM" }).is_active, true);
  });
  it("plan: needs a product and a price, rejects negative prices and tax over 100", () => {
    const product_id = "11111111-1111-4111-8111-111111111111";
    assert.equal(createPlanSchema.safeParse({ name: "Pro" }).success, false);
    assert.equal(createPlanSchema.safeParse({ product_id, name: "Pro", price: -1 }).success, false);
    assert.equal(createPlanSchema.safeParse({ product_id, name: "Pro", price: 10, tax_rate: 101 }).success, false);
    const plan = createPlanSchema.parse({ product_id, name: "Pro", price: 499 });
    assert.equal(plan.currency, "INR");
    assert.equal(plan.billing_interval, "month");
  });
});
