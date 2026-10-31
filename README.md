# SubscriptIQ

**A subscription management system that takes a business from "who is our customer?" to "who still owes us money?"** Keep customers and plans, run subscriptions and quotations, bill customers automatically, collect payments, chase overdue invoices, and see the numbers on one page.

## The problem

Businesses that sell on subscription end up with the same mess: customers in one place, prices in another, invoices in a spreadsheet and payments in a bank statement. Nobody is sure which period was billed, which invoice is still unpaid, or how much money is actually coming in.

## The solution

SubscriptIQ keeps the whole life of a subscription in one system, with one set of rules for money:

```
Customer ─▶ Plan ─▶ Quotation ─▶ Subscription ─▶ Invoice ─▶ Payment
                                       │             │
                                       └─ billed ────┘     overdue tracking · financial overview
                                          every period
```

- A customer is quoted a plan; the accepted quotation becomes a subscription.
- Every billing period the subscription produces exactly one invoice, with tax and discounts calculated the same way everywhere.
- Payments, full or partial, update the invoice automatically; unpaid invoices past their due date become overdue.
- Staff see billed, collected, outstanding and overdue money at a glance; customers see only their own records in a portal.

## What you can do with it

| | |
|---|---|
| **Customers, products, plans** | Maintain customers, a product catalogue, and priced plans with billing interval, trial days, setup fee and tax rate. |
| **Subscriptions and quotations** | Subscribe a customer to several items; move a subscription through trial, active, paused, past due, cancelled and expired. Send quotations, accept or reject them, and convert an accepted one into a subscription. |
| **Invoices** | Create, issue and void invoices with line items, percentage or fixed discounts and tax. |
| **Payments** | Record full or partial payments (UPI, card, bank transfer, cash, cheque) and refunds. |
| **Recurring billing** | One click bills every subscription whose billing date has arrived. |
| **Overdue tracking** | Past-due invoices are flagged, aged and filterable. |
| **Financial overview** | Billed vs collected by month, receivables aging, status and payment-method breakdowns, top overdue customers. |
| **Dashboard, analytics, customer portal** | Revenue and MRR views for staff; a portal where each customer sees only their own subscriptions, invoices and payments. |

Three roles: **admin**, **staff** and **customer**.

---

## How it is built

### Architecture

- **Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui.** Pages render on the server; forms use React Hook Form with Zod validation.
- **Supabase (Postgres and Auth) is the only backend.** There is no custom server. The browser and the Next.js server talk to Supabase with the **anon key and the signed-in user's session**.
- **Security lives in the database.** Row Level Security (RLS) policies decide who can read or write every row: staff see everything, customers see only their own records. The Supabase `service_role` key is never used anywhere.
- **Every API route** starts with an authorization check, validates its input with a shared Zod schema, and returns one response shape: `{ data }`, `{ data, meta }` for lists, or `{ error: { code, message } }`.

### Data model

`profiles` (a user and role) · `customers` · `products` · `plans` · `subscriptions` and `subscription_items` · `quotations` and `quotation_items` · `invoices` and `invoice_items` · `payments`. Statuses are text columns with `CHECK` constraints, and every table keeps `created_at` / `updated_at` automatically. Subscription, quotation and invoice lines store a **snapshot** of the description and price, so changing a plan later never rewrites history.

### One set of money rules

All amounts come from a single calculator (`src/lib/money.ts`): gross = quantity × price, the discount (a percentage **or** a capped fixed amount) comes off first, tax is charged on the discounted amount, and every line is rounded to two decimals. Quotations, subscriptions and invoices use it, so a quotation converted to an invoice gives identical numbers, and the database re-checks the totals before saving.

### Changes that must not half-happen

Anything that touches money is a Postgres function that runs in **one transaction**, locks the rows it changes, and runs as the caller so RLS still applies:

- **Create invoice**: header and lines saved together, totals verified.
- **Record payment**: locks the invoice, refuses overpayment and non-payable invoices, and accepts an **idempotency key**, so a double click or a retry after a network error returns the original payment instead of charging twice.
- **Void, overdue sweep, edit draft**: each its own safe operation.
- **Bill a subscription**: creates the invoice, issues it and moves the subscription's dates forward in one step.

Database triggers keep an invoice's `amount_paid` and status equal to the sum of its succeeded payments, so the status cannot drift out of step with the payments.

---

## How billing works

### An invoice's life

```
draft ──issue──▶ open ──payment──▶ partially_paid ──payment──▶ paid
                  │                      │
                  └── past due date ──▶ overdue   (stays overdue until fully paid)

draft / open / overdue with no payments ──void──▶ void
a refunded payment reopens the balance
```

### Recurring billing

A subscription is billed **in advance**. A period starts on its `next_billing_date`; dates are inclusive (`period_end = start + interval − 1 day`); the invoice is issued as `open` and due 14 days later. A unique rule on `(subscription, period start)` makes billing the same period twice impossible, and a subscription that is several periods behind catches up one period per run. Only `active` and `past_due` subscriptions are billed, and billing never changes a subscription's status.

Billing runs from the **Run recurring billing** button or `POST /api/invoices/generate-due`. It is not on a timer yet; Vercel Cron or Supabase `pg_cron` can call the endpoint when you want it automatic.

### Overdue tracking

A sweep (button or `POST /api/invoices/mark-overdue`) flags open and partially paid invoices past their due date as overdue. The invoice list also shows "N days overdue" and its overdue filter is accurate even before the sweep runs.

### Financial overview

The figures are calculated inside Postgres, so they stay exact however many invoices exist, and they are reported **per currency**, never mixed.

- **Billed**: invoices issued in the period, excluding draft and void.
- **Collected**: succeeded payments made in the period. Failed and refunded payments don't count.
- **Outstanding**: unpaid balance of every open, partially paid or overdue invoice **as of today**; **overdue** is the part already past its due date.
- **Aging**: unpaid balances grouped as not yet due, 1–30, 31–60, 61–90 and 90+ days past due.

Served by `GET /api/invoices/summary` and `GET /api/invoices/aging`, and shown on the **Financial overview** page.

---

## How it was verified

- **Unit tests** (`npm test`): money maths, the recurring-billing planner, payment error mapping, report shaping and input validation.
- **End-to-end test** (`npm run test:db`): a full billing scenario on an in-memory Postgres with every migration applied. It covers invoice, recurring run, partial, full and failed payments, refund, void, overdue sweep, financial reports and row level security.
- **Build checks:** TypeScript, ESLint and the production build are clean.
- **Realistic demo data:** 12 customers, 12 subscriptions and 67 invoices with 67 payments over about a year, in every status. The overview totals were cross-checked against numbers recomputed independently.

---

## Using it

### What you need

Node.js 20 or newer, and a free [Supabase](https://supabase.com) project.

### 1. Get the code

```bash
git clone https://github.com/arunimanithin/subscription-management-system.git
cd subscription-management-system
npm install
```

### 2. Set up the database

In Supabase, open the **SQL Editor** and run every file in `supabase/migrations/` **in filename order**. They create the tables, security rules, views and the billing functions. In **Authentication → Providers → Email**, turn off "Confirm email" for development.

### 3. Connect the app

```bash
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
```

Put your Supabase **Project URL** and **anon key** (Project Settings → API) into `.env.local`. Never use the `service_role` key.

### 4. Make yourself admin

Sign up in the app (or add a user in **Authentication → Users**), then run in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

New sign-ups are always `customer`.

### 5. Load the demo data (development projects only)

1. In **Authentication → Users → Add user** (tick *Auto Confirm User*) create these five users with one development password:

   | Email | Role | What it shows |
   |---|---|---|
   | `meera.menon@subscriptiq.example.com` | staff | day-to-day billing |
   | `rahul.varma@subscriptiq.example.com` | staff | a second staff user |
   | `priya.nair@aaravtextiles.example.com` | customer of Aarav Textiles | the customer portal |
   | `anil.thomas@keralaspice.example.com` | customer of Kerala Spice Co | customers only see their own data |
   | `divya.ramesh@niladigital.example.com` | customer of Nila Digital Studio | a third customer |

2. Paste `supabase/seed-demo.sql` into the SQL Editor and run it. It ends with a notice like `Demo data present: 12 customers, 12 subscriptions, 67 invoices, 67 payments … 5 of 5`.

It is safe to re-run, never changes real data, contains no passwords or keys, and demo rows are easy to spot (`INV-DEMO-001`, `SUB-DEMO-03`). `supabase/unseed-demo.sql` removes only the demo rows. Two subscriptions are due today, so **Run recurring billing** creates two invoices straight away.

### 6. Run it

```bash
npm run dev          # http://localhost:3000
```

`http://localhost:3000/health` confirms the app can reach Supabase and the schema. Then try: **Invoices → Run recurring billing**, record a payment on an invoice, and open **Financial overview**.

### Limits to know about

- Recurring billing starts from the button or API; there is no scheduler yet.
- A draft invoice can be edited through `PATCH /api/invoices/:id`, but there is no edit screen.
- Customers can't record payments; staff enter them.
- Amounts in different currencies are never converted.

### For developers

The full API (every endpoint, request and response type, roles), the database tables and the team's ownership and Git rules are in [CONTRACTS.md](./CONTRACTS.md). Billing details are in `src/features/billing/README.md`. Scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, and `npm run test:db` (first run `npm install --no-save @electric-sql/pglite`).
