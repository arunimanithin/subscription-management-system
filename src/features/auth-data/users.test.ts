import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSelfRoleChange, sanitizeSearch, usersQuerySchema } from "./users";

describe("usersQuerySchema", () => {
  it("applies list defaults and accepts a role filter", () => {
    const q = usersQuerySchema.parse({ role: "staff" });
    assert.equal(q.page, 1);
    assert.equal(q.page_size, 20);
    assert.equal(q.role, "staff");
  });
  it("rejects an unknown role", () => {
    assert.equal(usersQuerySchema.safeParse({ role: "owner" }).success, false);
  });
});

describe("sanitizeSearch", () => {
  it("removes characters that could break the filter", () => {
    assert.equal(sanitizeSearch("a%b,c(d)e*"), "a b c d e");
    assert.equal(sanitizeSearch("  meera  menon "), "meera menon");
  });
});

describe("isSelfRoleChange", () => {
  it("blocks an admin changing their own role only", () => {
    assert.equal(isSelfRoleChange("a", "a", "staff", "admin"), true);
    assert.equal(isSelfRoleChange("a", "a", "admin", "admin"), false);
    assert.equal(isSelfRoleChange("a", "a", undefined, "admin"), false);
    assert.equal(isSelfRoleChange("a", "b", "staff", "customer"), false);
  });
});
