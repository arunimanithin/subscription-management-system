# SubscriptIQ

A subscription management system: keep customers, products and plans, run subscriptions and quotations, bill customers automatically, collect payments, chase overdue money, and see how the business is doing.

Built with **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres + Auth) · Zod · React Hook Form · Recharts**.

> [CONTRACTS.md](./CONTRACTS.md) is the source of truth for the database, types, API endpoints, ownership and Git rules. If this README and CONTRACTS.md disagree, CONTRACTS.md wins.

---

## What it does

| Area | What you can do |
|---|---|
| **Customers, products, plans** | Manage customers (active / inactive), a product catalogue and priced plans with billing interval, trial days, setup fee and tax rate. |
| **Subscriptions & quotations** | Create subscriptions with several items; move them through trial, active, paused, past due, cancelled and expired. Send quotations, accept or reject them and convert an accepted quotation into a subscription. |
| **Invoices** | Draft, issue and void invoices. Line items carry quantity, unit price, percentage **or** fixed discount and tax. Totals come from one shared calculator, so a quotation, a subscription and an invoice always agree. |
| **Payments** | Record full or partial payments (UPI, card, bank transfer, cash, cheque), refund them, and see the history. Duplicate clicks and retries never double-charge. |
| **Recurring billing** | One click (or one API call) bills every subscription whose billing date has arrived. Each period is billed exactly once. |
| **Overdue tracking** | Unpaid invoices past their due date are flagged overdue, shown with "N days overdue" and filterable. |
| **Financial overview** | Billed, collected, outstanding and overdue money, billed-vs-collected by month, receivables aging, invoices by status, payments by method and the top overdue customers. |
| **Dashboard, analytics, portal** | Revenue and MRR views for staff, and a customer portal where a customer sees only their own subscriptions, invoices and payments. |

Three roles: **admin**, **staff** and **customer**. Customers only ever see their own records.

---

## How it works

- **No custom backend server.** The browser and the Next.js server talk to Supabase with the **anon key and the signed-in user's session**. **Row Level Security (RLS)** in Postgres decides who can read or write each row.
- **The Supabase `service_role` key is never used**, never stored in this project and must never be committed.
- **Important changes are atomic.** Creating an invoice, recording a payment, voiding, running the overdue sweep and billing a subscription are Postgres functions that run in one transaction, lock the rows they change and run as the caller (so RLS still applies).
- **Everything is validated** with shared Zod schemas, and every API route starts with an authorization check.
- **API shape:** success `{ "data": … }`, lists add `"meta": { page, page_size, total }`, errors `{ "error": { code, message } }`.

### How an invoice lives

```
draft ──issue──▶ open ──payment──▶ partially_paid ──payment──▶ paid
                  │                       │
                  └── past due date ──▶ overdue (stays overdue until fully paid)
open / overdue / draft, with no payments ──void──▶ void
a refunded payment reopens the balance
```

### Recurring billing

A subscription is billed **in advance**. A period starts on its `next_billing_date`, dates are inclusive (`period_end = start + interval − 1 day`) and the invoice is issued as `open`, due 14 days later. The invoice and the subscription's new dates are saved in one transaction, so a period can never be skipped or billed twice. A subscription several periods behind catches up one period per run. Only `active` and `past_due` subscriptions are billed; billing never changes a subscription's status.

When a subscription is activated it should set `current_period_start = start_date`, `current_period_end = start_date + interval − 1 day` and `next_billing_date = start_date` so the first period is billed straight away.

Billing is **not automatic yet**: it runs from the **Run recurring billing** button or `POST /api/invoices/generate-due`. Scheduling it (Vercel Cron or Supabase `pg_cron`) is a deployment choice.

### What the financial figures mean

- **Billed**: total of invoices issued in the period, excluding draft and void.
- **Collected**: succeeded payments made in the period. Failed and refunded payments are not collected.
- **Outstanding**: unpaid balance of every open, partially paid or overdue invoice **as of today** (not limited to the period). **Overdue** is the part already past its due date.
- **Aging**: unpaid balances grouped as not yet due, 1–30, 31–60, 61–90 and 90+ days past due.
- Different currencies are reported separately and never added together.

---

## Getting started

Requires **Node.js 20+** (verified on Node 22).

### 1. Get the code

```bash
git clone https://github.com/arunimanithin/subscription-management-system.git
cd subscription-management-system
npm install
```

### 2. Set up Supabase (once per Supabase project)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the *Project URL* and the *anon* key.
3. **SQL Editor**: run every file in `supabase/migrations/` **in filename order**:

   | File | Adds |
   |---|---|
   | `…100001` – `…100003` | profiles, customers, products, plans, subscriptions, quotations |
   | `…100004` | invoices and payments, with triggers that keep invoice status in sync with payments |
   | `…100005` | Row Level Security policies |
   | `…100006` | analytics views (MRR, monthly revenue, overdue invoices) |
   | `…110001` | atomic invoice creation |
   | `…120001` | payment recording (overpayment blocked, retry-safe) |
   | `…130001` | void, overdue sweep, draft edits |
   | `…140001` | recurring billing |
   | `…150001` | financial overview and aging reports |

4. **Authentication → Providers → Email**: for development turn **off** "Confirm email" so sign-up works immediately.
5. Sign up (or **Authentication → Users → Add user**), then make yourself admin in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   New sign-ups are always `customer`. A customer sees portal data once an admin or staff user links them by setting `customers.user_id` to their profile id.

### 3. Configure the app

```bash
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `.env.local` is git-ignored. **Never add the `service_role` key.**

### 4. Load the demo data (optional, development projects only)

`supabase/seed-demo.sql` gives every teammate the same realistic data: 12 customers, 7 products, 9 plans, 12 subscriptions in every status, 6 quotations, **67 invoices and 67 payments over about 12 months** in every status, with percentage and fixed discounts, partial payments, a failed attempt, a pending transfer and a refund. Two subscriptions are due today, so **Run recurring billing** creates two invoices.

1. In **Authentication → Users → Add user** (tick *Auto Confirm User*) create these five users with one development password (share it in chat, never in Git):

   | Email | Becomes | Use it to test |
   |---|---|---|
   | `meera.menon@subscriptiq.example.com` | staff | day-to-day billing work |
   | `rahul.varma@subscriptiq.example.com` | staff | a second staff user |
   | `priya.nair@aaravtextiles.example.com` | customer of *Aarav Textiles* | the customer portal |
   | `anil.thomas@keralaspice.example.com` | customer of *Kerala Spice Co* | checking that customers are isolated |
   | `divya.ramesh@niladigital.example.com` | customer of *Nila Digital Studio* | a third customer |

2. Paste the whole of `supabase/seed-demo.sql` into the SQL Editor and run it. It ends with a notice such as `Demo data present: 12 customers, 12 subscriptions, 67 invoices, 67 payments … 5 of 5`. If it reports fewer than 5 users, create the missing ones and run it again.

The seed is **safe to re-run** (no duplicates), never changes or deletes real data, contains no passwords or keys, and rolls back if any invoice total is inconsistent. Demo rows are easy to spot (`INV-DEMO-001`, `SUB-DEMO-03`, SKUs `DEMO-*`). Your own admin account is untouched. To remove the demo data, run `supabase/unseed-demo.sql` and delete the five demo users by hand. **Never run the seed on production.**

### 5. Run

```bash
npm run dev          # http://localhost:3000
```

Open **http://localhost:3000/health**: it shows whether the environment variables are set and whether Supabase and the schema are reachable.

---

## Scripts and tests

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build and serve |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests: money maths, recurring-billing planner, payment error mapping, report shaping and validation |
| `npm run test:db` | End-to-end billing scenario on an in-memory Postgres with every migration applied: invoice → recurring run → partial, full and failed payments → refund → void → overdue sweep → financial reports → row level security. Needs no Supabase project. First run `npm install --no-save @electric-sql/pglite` (this does not change `package.json`). |

Before every push: `npm run typecheck && npm run lint && npm run build`.

---

## API at a glance

Every route requires a signed-in user; roles are **A**dmin, **S**taff, **C**ustomer (own records only). The complete list with request and response types is in [CONTRACTS.md](./CONTRACTS.md) section 4.

| Area | Endpoints | Roles |
|---|---|---|
| Invoices | `GET/POST /api/invoices` · `GET/PATCH /api/invoices/:id` · `POST /api/invoices/:id/transition` (issue, void) | A S (read also C) |
| Recurring billing | `POST /api/invoices/generate` · `POST /api/invoices/generate-due` | A S |
| Overdue | `POST /api/invoices/mark-overdue` | A S |
| Reports | `GET /api/invoices/summary?from&to` · `GET /api/invoices/aging?as_of` | A S |
| Payments | `GET/POST /api/payments` · `GET /api/payments/:id` · `POST /api/payments/:id/refund` | A S (read also C) |
| Customers, products, plans, subscriptions, quotations | see CONTRACTS.md | A S |
| Dashboard, analytics, portal | see CONTRACTS.md | A S / C |

---

## Project structure

```
supabase/
  migrations/        numbered SQL files, applied in filename order
  seed-demo.sql      shared demo data (idempotent)      unseed-demo.sql  removes it
  tests/             billing-e2e.mjs, the in-memory Postgres end-to-end test
src/
  types/             enums, entities, Zod schemas, API types
  lib/               money.ts, billing-period.ts, API guard and response helpers, Supabase clients
  components/        shared UI (shadcn/ui primitives, status badge, page header, app shell)
  features/          one folder per module: nav.ts + index.ts + its own components and services
    billing/         invoices, payments, recurring billing, reports (see its README.md)
  app/
    (app)/…          staff pages: customers, products, plans, subscriptions, quotations,
                     invoices (+ /invoices/overview), payments, dashboard, analytics
    portal/          customer portal
    api/…            route handlers, owned by the module that owns the resource
    health/          configuration and connectivity check
```

Conventions: JSON and database columns use `snake_case`; money is a number with 2 decimals; dates are `YYYY-MM-DD`; the default currency is `INR`.

---

## Working in the team

- One branch per module; only edit your module's folders. Shared files (`src/types`, `src/lib`, `src/components`, `supabase`, `CONTRACTS.md`, `README.md`, root config) change only through a backward-compatible pull request into `main`.
- Reading another module's tables is fine (RLS applies); **writing** to them goes through that module's endpoint.
- New database change → a new file `supabase/migrations/YYYYMMDDHHMMSS_<module>_<what>.sql` with a later timestamp than every existing file. Never edit a migration that has already been run.

```bash
git pull --rebase origin main        # at least hourly
npm run typecheck && npm run lint && npm run build
git add -A && git commit -m "feat(<module>): …" && git push origin <your-branch>
# open a pull request into main
```

---

## Troubleshooting

- **`/health` says invalid key** – wrong URL or anon key in `.env.local`; restart `npm run dev` after editing it.
- **`/health` says schema missing** – the migrations have not been run in this Supabase project.
- **Run recurring billing or the Financial overview shows an error mentioning a missing function** – run the latest migrations (`…140001`, `…150001`).
- **Sign-up works but you see no data** – your profile is `customer`; promote yourself to admin (setup step 2.5).
- **A customer user sees nothing** – their customer row must have `customers.user_id` set to their profile id.
- **The demo seed says fewer than 5 demo users found** – create the missing users in Authentication → Users and run it again.

---

## Current status and limits

- Billing (invoices, payments, overdue tracking, recurring billing and the financial overview) is complete and has been tested screen by screen against a live Supabase project, plus the automated tests above.
- Recurring billing runs only from the button or the API; there is no scheduler yet.
- Editing a draft invoice is available through `PATCH /api/invoices/:id` only; there is no edit screen.
- Customers cannot record payments; payments are entered by staff.
- Amounts in different currencies are never converted.
- Not covered by the automated tests: the HTTP routes and the screens themselves, and `supabase db push`.
