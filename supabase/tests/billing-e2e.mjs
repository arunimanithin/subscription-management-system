// Billing end-to-end test on a real Postgres engine (PGlite, in memory – no Supabase project needed).
// Applies EVERY migration in supabase/migrations, then runs a complete billing scenario through the
// same database functions the app calls: create invoice -> recurring generate -> payments (partial, full,
// failed) -> refund -> void -> overdue sweep -> financial summary and aging, plus row level security.
// Every expected number below is worked out by hand in the comment next to it.
//
// Run:  npm install --no-save @electric-sql/pglite     (once; does not touch package.json)
//       npm run test:db
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let PGlite;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
} catch {
  console.error("Missing dev dependency. Run once:  npm install --no-save @electric-sql/pglite");
  process.exit(2);
}
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..") + path.sep;
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true),'')::uuid $$;
grant usage on schema public, auth to anon, authenticated;`);
for (const f of fs.readdirSync(dir + "migrations").sort()) await db.exec(fs.readFileSync(dir + "migrations/" + f, "utf8"));
console.log("all migrations applied");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? "PASS " : "FAIL ") + m); };
const S = "00000000-0000-0000-0000-00000000eee2", CA = "00000000-0000-0000-0000-00000000eee3", CB = "00000000-0000-0000-0000-00000000eee4";
for (const [id, e] of [[S, "s@x.io"], [CA, "ca@x.io"], [CB, "cb@x.io"]]) await db.query("insert into auth.users(id,email) values($1,$2)", [id, e]);
await db.exec(`update profiles set role='staff' where id='${S}'`);
const as = async (u) => db.exec(`reset role; select set_config('request.jwt.sub','${u}',false); set role authenticated;`);
const q = async (s, p) => (await db.query(s, p)).rows;
const code = async (f, m, c) => { try { await f(); ok(false, m + " (no error)"); } catch (e) { ok(e.code === c, m + ` -> ${e.code}: ${e.message.slice(0, 70)}`); } };
const D = async (sql) => (await q(`select (${sql})::text d`))[0].d;
const num = (x) => Math.round(Number(x) * 100) / 100;
const summary = async (f = null, t = null) => (await q("select public.billing_financial_summary($1,$2) r", [f, t]))[0].r;
const aging = async (a = null) => (await q("select public.billing_aging($1) r", [a]))[0].r;
const cur = (r, c = "INR") => r.currencies.find((x) => x.currency === c);

await as(S);
const A = (await q("insert into customers(name,user_id) values('Alpha Textiles',$1) returning id", [CA]))[0].id;
const B = (await q("insert into customers(name,user_id) values('Bravo Foods',$1) returning id", [CB]))[0].id;

// --- builds a real invoice through the same RPC the app uses (base amount + 18% tax)
const mk = async (cust, base, issueOff, dueOff, { currency = "INR", status = "open" } = {}) => {
  const tax = Math.round(base * 18) / 100, total = base + tax;
  const issue = await D(`current_date + ${issueOff}`), due = await D(`current_date + ${dueOff}`);
  const inv = { customer_id: cust, currency, issue_date: issue, due_date: due, subtotal: base, discount_total: 0, tax_total: tax, total };
  const items = [{ description: "Plan", quantity: 1, unit_price: base, discount_percent: 0, tax_rate: 18, discount_amount: 0, tax_amount: tax, line_total: total }];
  const id = (await q("select public.create_invoice_with_items($1,$2) id", [JSON.stringify(inv), JSON.stringify(items)]))[0].id;
  if (status !== "draft") await q("update invoices set status='open' where id=$1", [id]);
  return id;
};
const pay = async (inv, amt, method, dayOff, status = "succeeded", key = null) =>
  (await q(`select public.record_payment($1,$2,$3,null,(current_date + ${dayOff} + time '12:00')::timestamptz,null,$4,$5) r`, [inv, amt, method, key, status]))[0].r;

// ---- empty database
let r = await summary();
ok(Array.isArray(r.currencies) && r.currencies.length === 0, "empty database: summary has no currencies and does not fail");
r = await aging();
ok(Array.isArray(r.currencies) && r.currencies.length === 0, "empty database: aging has no currencies and does not fail");

// ---- end-to-end scenario (all numbers worked out by hand)
const i1 = await mk(A, 1000, -40, -26);                 // 1180, will be paid in full
await pay(i1, 1180, "upi", -30);
const i2 = await mk(A, 500, -20, -6);                   // 590, partial 200 -> overdue, 390 due
await pay(i2, 200, "cash", -10);
await pay(i2, 50, "card", -9, "failed");                // failed payment: must not count as collected
const i3 = await mk(B, 2000, -100, -86);                // 2360, untouched, 86 days overdue
const i4 = await mk(A, 100, 0, 14);                     // 118, paid then refunded -> open again
await pay(i4, 118, "card", 0);
const p4 = (await q("select id from payments where invoice_id=$1 and status='succeeded'", [i4]))[0].id;
await q("update payments set status='refunded' where id=$1", [p4]);
await mk(A, 500, 0, 14, { status: "draft" }); // 590 draft: never billed
const voided = await mk(B, 300, -5, 9);                 // 354 -> void
await q("select public.void_invoice($1, 'test')", [voided]);
await mk(B, 100, 0, 14, { currency: "USD" }); // 118 USD, kept apart from INR
// recurring invoice through the real function
const T = await D("current_date"), E = await D("current_date + 29"), N = await D("current_date + 30");
const sub = (await q(`insert into subscriptions(customer_id,status,start_date,current_period_start,current_period_end,next_billing_date)
  values($1,'active',current_date-30,current_date-30,current_date-1,current_date) returning id`, [A]))[0].id;
const rec = (await q("select public.generate_subscription_invoice($1,$2,$3,$4,$5,$6) r", [sub, T, E, N,
  JSON.stringify({ customer_id: A, currency: "INR", issue_date: T, due_date: E, subtotal: 100, discount_total: 0, tax_total: 18, total: 118 }),
  JSON.stringify([{ description: "Plan", quantity: 1, unit_price: 100, discount_percent: 0, tax_rate: 18, discount_amount: 0, tax_amount: 18, line_total: 118 }])]))[0].r;
ok(rec.replayed === false, "recurring run created an invoice");
ok((await q("select public.mark_overdue_invoices() n"))[0].n >= 0, "overdue sweep ran");

const st = async (id) => (await q("select status, amount_paid::float8 p, amount_due::float8 d from invoices where id=$1", [id]))[0];
ok((await st(i1)).status === "paid", "i1 paid in full -> paid");
ok((await st(i2)).status === "overdue" && (await st(i2)).d === 390, "i2 partial + past due -> overdue, 390 left");
ok((await st(i3)).status === "overdue", "i3 swept to overdue");
ok((await st(i4)).status === "open" && (await st(i4)).d === 118, "i4 refund reopens the balance");
ok((await st(voided)).status === "void", "void invoice voided");

// ---- all-time figures (hand-computed)
r = await summary();
let inr = cur(r);
ok(num(inr.billed) === 4366, `INR billed 1180+590+2360+118+118 = 4366 (got ${inr.billed})`);
ok(num(inr.collected) === 1380, `INR collected 1180+200 = 1380 (got ${inr.collected})`);
ok(num(inr.refunded) === 118, `INR refunded 118 (got ${inr.refunded})`);
ok(inr.failed_payments === 1, "1 failed payment counted separately");
ok(num(inr.outstanding) === 2986, `INR outstanding 390+2360+118+118 = 2986 (got ${inr.outstanding})`);
ok(num(inr.overdue_amount) === 2750 && inr.overdue_count === 2, `INR overdue 390+2360 = 2750 over 2 invoices (got ${inr.overdue_amount}/${inr.overdue_count})`);
ok(inr.open_invoice_count === 4, "4 invoices with a balance");
ok(num(inr.billed_paid) === 1380, "paid against billed invoices = 1380");
const bs = inr.invoices_by_status;
ok(bs.draft.count === 1 && bs.void.count === 1 && bs.paid.count === 1 && bs.overdue.count === 2 && bs.open.count === 2, "status breakdown counts");
ok(num(bs.draft.total) === 590 && num(bs.void.total) === 354, "draft and void totals shown in the breakdown but not in billed");
ok(inr.payments_by_method.length === 2 && inr.payments_by_method[0].method === "upi" && num(inr.payments_by_method[0].amount) === 1180, "payments by method: upi 1180 first, cash 200; failed and refunded excluded");
const mb = inr.monthly.reduce((s, m) => s + num(m.billed), 0), mc = inr.monthly.reduce((s, m) => s + num(m.collected), 0);
ok(num(mb) === 4366 && num(mc) === 1380, `monthly series adds up to the totals (${mb} / ${mc})`);
ok(inr.monthly.every((m, i, a) => i === 0 || a[i - 1].month < m.month), "monthly series is in date order");
const usdr = cur(r, "USD");
ok(num(usdr.billed) === 118 && num(usdr.outstanding) === 118 && num(usdr.overdue_amount) === 0, "USD kept separate from INR");
ok(r.currencies[0].currency === "INR", "currencies ordered by billed amount");

// ---- period filter
const f30 = await D("current_date - 30"), t0 = await D("current_date");
r = await summary(f30, t0); inr = cur(r);
ok(num(inr.billed) === 826, `last 30 days billed 590+118+118 = 826 (got ${inr.billed})`);
ok(num(inr.collected) === 1380, `payments on the boundary day are included (got ${inr.collected})`);
ok(num(inr.outstanding) === 2986, "outstanding is as-of-today, not limited to the period");
r = await summary(await D("current_date - 120"), await D("current_date - 50")); inr = cur(r);
ok(num(inr.billed) === 2360 && num(inr.collected) === 0, "old window shows only the old invoice");
r = await summary(await D("current_date + 100"), await D("current_date + 200"));
ok(cur(r) && num(cur(r).billed) === 0 && cur(r).monthly.length === 0, "empty window returns zeros, not an error");

// ---- aging
r = await aging(); inr = cur(r);
const bk = Object.fromEntries(inr.buckets.map((b) => [b.bucket, b]));
ok(inr.buckets.map((b) => b.bucket).join() === "current,1-30,31-60,61-90,90+", "all five buckets always returned, in order");
ok(bk.current.count === 2 && num(bk.current.amount) === 236, "current (not yet due): i4 + recurring = 236");
ok(bk["1-30"].count === 1 && num(bk["1-30"].amount) === 390, "1-30 days: i2 390");
ok(bk["61-90"].count === 1 && num(bk["61-90"].amount) === 2360, "61-90 days: i3 2360 (86 days)");
ok(bk["31-60"].count === 0 && bk["90+"].count === 0, "empty buckets are zero");
ok(num(inr.total_outstanding) === 2986 && num(inr.total_overdue) === 2750, "aging totals match the summary");
ok(inr.top_overdue_customers.length === 2 && inr.top_overdue_customers[0].customer_name === "Bravo Foods"
  && num(inr.top_overdue_customers[0].amount) === 2360 && inr.top_overdue_customers[0].oldest_days_overdue === 86
  && inr.top_overdue_customers[1].customer_name === "Alpha Textiles" && num(inr.top_overdue_customers[1].amount) === 390,
  "top debtors: Bravo 2360 (86d) then Alpha 390");
r = await aging(await D("current_date + 30")); inr = cur(r);
const bk2 = Object.fromEntries(inr.buckets.map((b) => [b.bucket, b]));
ok(bk2["1-30"].count === 2 && bk2["31-60"].count === 1 && bk2["90+"].count === 1 && bk2.current.count === 0, "as_of 30 days later: i4+recurring in 1-30, i2 (36d) in 31-60, i3 (116d) in 90+");

// ---- a fully paid invoice leaves the outstanding figures
await pay(i2, 390, "bank_transfer", 0);
ok((await st(i2)).status === "paid", "i2 paid off");
inr = cur(await summary());
ok(num(inr.outstanding) === 2596 && num(inr.overdue_amount) === 2360 && inr.overdue_count === 1, "paying i2 lowers outstanding and overdue immediately");
ok(num(inr.collected) === 1770, "and raises collected (1380+390)");

// ---- permissions / RLS
await as(CA);
inr = cur(await summary());
ok(num(inr.billed) > 0 && num(inr.billed) < 4366 && !cur(await summary(), "USD"), "a customer calling the function only aggregates their own invoices (RLS)");
await as(CB);
const bb = cur(await summary(), "INR");
ok(num(bb.billed) === 2360, `customer B sees only their own billed total (got ${bb.billed})`);
await db.exec("reset role; set role anon;");
await code(() => q("select public.billing_financial_summary()"), "anonymous caller cannot run the summary", "42501");
await code(() => q("select public.billing_aging()"), "anonymous caller cannot run aging", "42501");
await db.exec("reset role;");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
