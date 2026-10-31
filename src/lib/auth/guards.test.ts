import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideRoute, safeNext } from "./guards";

const go = (to: string) => ({ action: "redirect", to });
const allow = { action: "allow" };

describe("decideRoute", () => {
  it("lets API routes through (they answer 401/403 themselves)", () => {
    assert.deepEqual(decideRoute({ pathname: "/api/invoices", signedIn: false, role: null }), allow);
  });

  it("sends visitors who are not signed in to the login page and remembers where they were going", () => {
    assert.deepEqual(decideRoute({ pathname: "/invoices", search: "?status=overdue", signedIn: false, role: null }), go("/auth/login?next=%2Finvoices%3Fstatus%3Doverdue"));
    assert.deepEqual(decideRoute({ pathname: "/", signedIn: false, role: null }), go("/auth/login"));
  });

  it("keeps the public pages open", () => {
    for (const p of ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/health"]) {
      assert.deepEqual(decideRoute({ pathname: p, signedIn: false, role: null }), allow, p);
    }
  });

  it("bounces signed-in users away from login and register, but not from password reset", () => {
    assert.deepEqual(decideRoute({ pathname: "/auth/login", signedIn: true, role: "customer" }), go("/customer-portal"));
    assert.deepEqual(decideRoute({ pathname: "/auth/register", signedIn: true, role: "staff" }), go("/dashboard"));
    assert.deepEqual(decideRoute({ pathname: "/auth/reset-password", signedIn: true, role: "customer" }), allow);
    assert.deepEqual(decideRoute({ pathname: "/auth/forgot-password", signedIn: true, role: "admin" }), allow);
  });

  it("sends each role to its own home from /", () => {
    assert.deepEqual(decideRoute({ pathname: "/", signedIn: true, role: "admin" }), go("/dashboard"));
    assert.deepEqual(decideRoute({ pathname: "/", signedIn: true, role: "staff" }), go("/dashboard"));
    assert.deepEqual(decideRoute({ pathname: "/", signedIn: true, role: "customer" }), go("/customer-portal"));
  });

  it("keeps customers inside the portal", () => {
    assert.deepEqual(decideRoute({ pathname: "/portal", signedIn: true, role: "customer" }), allow);
    assert.deepEqual(decideRoute({ pathname: "/portal/invoices", signedIn: true, role: "customer" }), allow);
    for (const p of ["/customer-portal", "/customer-portal/invoices", "/customer-portal/subscriptions"]) {
      assert.deepEqual(decideRoute({ pathname: p, signedIn: true, role: "customer" }), allow, p);
    }
    for (const p of ["/dashboard", "/invoices", "/customers/abc", "/users"]) {
      assert.deepEqual(decideRoute({ pathname: p, signedIn: true, role: "customer" }), go("/customer-portal"), p);
    }
  });

  it("keeps staff and admins out of the customer portal", () => {
    assert.deepEqual(decideRoute({ pathname: "/portal", signedIn: true, role: "staff" }), go("/dashboard"));
    assert.deepEqual(decideRoute({ pathname: "/portal", signedIn: true, role: "admin" }), go("/dashboard"));
    assert.deepEqual(decideRoute({ pathname: "/customer-portal/payments", signedIn: true, role: "staff" }), go("/dashboard"));
  });

  it("allows staff and admins into the staff pages; only admins into /users", () => {
    for (const role of ["staff", "admin"] as const) {
      for (const p of ["/dashboard", "/invoices", "/payments", "/customers", "/subscriptions"]) {
        assert.deepEqual(decideRoute({ pathname: p, signedIn: true, role }), allow, `${role} ${p}`);
      }
    }
    assert.deepEqual(decideRoute({ pathname: "/users", signedIn: true, role: "admin" }), allow);
    assert.deepEqual(decideRoute({ pathname: "/users", signedIn: true, role: "staff" }), go("/dashboard"));
  });

  it("does not lock out a signed-in user whose role could not be read", () => {
    assert.deepEqual(decideRoute({ pathname: "/invoices", signedIn: true, role: null }), allow);
    assert.deepEqual(decideRoute({ pathname: "/auth/login", signedIn: true, role: null }), allow);
  });

  it("does not match look-alike paths", () => {
    assert.deepEqual(decideRoute({ pathname: "/portalx", signedIn: true, role: "customer" }), go("/customer-portal"));
    assert.deepEqual(decideRoute({ pathname: "/usersettings", signedIn: true, role: "staff" }), allow);
    assert.deepEqual(decideRoute({ pathname: "/authx", signedIn: false, role: null }), go("/auth/login?next=%2Fauthx"));
  });
});

describe("safeNext", () => {
  it("accepts same-site relative paths", () => {
    assert.equal(safeNext("/invoices"), "/invoices");
    assert.equal(safeNext("/invoices?status=overdue&page=2"), "/invoices?status=overdue&page=2");
  });
  it("rejects anything that could leave the site or loop", () => {
    for (const bad of [null, undefined, "", "invoices", "https://evil.com", "//evil.com", "/\\evil.com", "/auth/login", "/auth", "javascript:alert(1)", "/a\nb"]) {
      assert.equal(safeNext(bad as string | null | undefined), null, String(bad));
    }
  });
});
