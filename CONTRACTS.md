# SubscriptIQ – CONTRACTS.md (source of truth)

If code, chat and this file disagree, **this file wins**. Change it only through a PR to `main` reviewed by the Team Lead (Member 3).

---

## 1. Architecture and folder structure

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Supabase (Postgres + Auth). Browser and server code talk to Supabase with the **anon key and the user's session**; Postgres Row Level Security (RLS) enforces access. There is no service-role key anywhere in this repo.

```
supabase/
  migrations/            6 SQL files, applied in filename order (see section 9)
  seed.sql               optional demo products/plans
src/
  types/                 SHARED  enums.ts, entities.ts, schemas.ts (Zod), api.ts, nav.ts
  lib/                   SHARED  money.ts, billing-period.ts, utils.ts, env.ts, health.ts
    supabase/            SHARED  client.ts (browser), server.ts (server), middleware.ts
    api/                 SHARED  respond.ts (ok/list/fail), guard.ts (authorize, parseBody, parseQuery)
    auth/                M1      route guards (create this folder)
  components/
    ui/                  SHARED  shadcn/ui primitives (button, card, badge) – add more with `npx shadcn@latest add <name>`
    shared/              SHARED  StatusBadge, PageHeader, ModulePlaceholder
    layout/              SHARED  AppShell, Sidebar
  config/                SHARED  modules.ts (ownership), navigation.ts (aggregates feature nav files)
  middleware.ts          M1      session refresh (keep) + route guards (add)
  features/              ONE FOLDER PER MEMBER – each has nav.ts + index.ts; add components/, services/,
                         hooks/ or per-domain subfolders yourself when you need them
    auth-data/           M1      auth, customers, products, plans, users
    subscriptions/       M2      subscriptions, quotations
    billing/             M3      invoices, payments, overdue
    intelligence/        M4      dashboard, analytics, portal
  app/
    layout.tsx, page.tsx, globals.css       SHARED
    health/page.tsx, api/health/route.ts    SHARED (health check)
    auth/login, auth/register               M1
    (app)/layout.tsx                        SHARED staff shell (sidebar)
    (app)/customers|products|plans|users    M1 pages
    (app)/subscriptions|quotations          M2 pages
    (app)/invoices|payments                 M3 pages
    (app)/dashboard|analytics               M4 pages
    portal/                                 M4 customer portal (own layout)
    api/<resource>/...                      route handlers, owned by the module that owns the resource
```

Conventions: JSON and DB use **snake_case**. Money is a JS `number` with 2 decimals. Dates are `YYYY-MM-DD`; timestamps are ISO-8601. Default currency `INR`; **single-currency** assumption (no conversion).

## 2. Database

Migrations: `20261031100001`…`06`. Statuses are `text` + `CHECK` constraints (easy to extend). Every table has `id uuid` PK (`gen_random_uuid()`), `created_at`, `updated_at` (auto-maintained by trigger).

| Table | Key columns / constraints | Owner |
|---|---|---|
| `profiles` | `id` = `auth.users.id`, `email`, `full_name`, `role` (admin\|staff\|customer, default customer). Row auto-created on signup; role is never taken from client metadata | M1 |
| `customers` | `user_id` → profiles (unique, nullable; links a portal login), `name`, `email` (unique, case-insensitive), contact + address fields, `tax_id`, `status` (active\|inactive) | M1 |
| `products` | `name`, `sku` (unique), `category`, `is_active` | M1 |
| `plans` | `product_id` → products (restrict), `price ≥ 0`, `currency`, `billing_interval` (week\|month\|quarter\|year), `interval_count > 0`, `trial_days`, `setup_fee`, `tax_rate` 0-100, `is_active` | M1 |
| `subscriptions` | `subscription_number` (`SUB-000001`), `customer_id` (restrict), `status`, `billing_interval`+`interval_count` (one cycle for all items), `start_date`, `trial_end_date`, `current_period_start/end`, `next_billing_date`, `cancel_at_period_end`, `paused_at`, `cancelled_at`, `ended_at` | M2 |
| `subscription_items` | `subscription_id` (cascade), `plan_id`/`product_id` (set null on delete), **snapshot** `description`, `quantity > 0`, `unit_price`, `discount_percent`, `tax_rate` | M2 |
| `quotations` | `quotation_number` (`QUO-000001`), `customer_id`, `status`, `valid_until`, `subtotal`, `discount_total`, `tax_total`, `total`, `subscription_id` (set when converted) | M2 |
| `quotation_items` | like subscription items + computed `discount_amount`, `tax_amount`, `line_total` | M2 |
| `invoices` | `invoice_number` (`INV-000001`), `customer_id`, `subscription_id` (nullable), `status`, `issue_date`, `due_date ≥ issue_date`, `period_start/end`, `subtotal`, `discount_total`, `tax_total`, `total`, `amount_paid`, `amount_due` (generated = total − amount_paid), `paid_at`, `voided_at`. `amount_paid ≤ total`. **Unique (`subscription_id`,`period_start`) for non-void invoices** → recurring billing cannot double-bill a period | M3 |
| `invoice_items` | **snapshot** `description`, `quantity`, `unit_price`, `discount_percent`, `discount_amount`, `tax_rate`, `tax_amount`, `line_total`; `plan_id`/`product_id` set null on delete | M3 |
| `payments` | `invoice_id` (restrict), `customer_id` + `currency` (forced from the invoice by trigger), `amount > 0`, `method`, `status`, `reference`, `paid_at` | M3 |

Relationships: customer 1─* subscriptions, quotations, invoices, payments · product 1─* plans · subscription 1─* subscription_items, invoices · quotation 1─* quotation_items · quotation 0..1─1 subscription (on convert) · invoice 1─* invoice_items, payments.

**Database-enforced behaviour (tested, see section 7 of README):**
- Payments keep the invoice in sync: `amount_paid` = sum of `succeeded` payments; status becomes `partially_paid` / `paid` / back to `partially_paid`/`open`/`overdue` on refund or failure. Do **not** set `amount_paid` from the app.
- Invoices are created through `public.create_invoice_with_items(p_invoice jsonb, p_items jsonb)` (security invoker, RLS applies): invoice and items are saved in one transaction and header totals are verified against the lines. Use it instead of inserting into `invoices`/`invoice_items` directly.
- Overpayment fails with a check violation (`23514`). Payments against `draft`/`void` invoices are rejected.
- **Snapshots:** when creating any item copy values from the plan; never join to `plans` for historical prices.

**Views (read-only, `security_invoker`, RLS applies):** `subscription_item_mrr` (one row per item, monthly value, tax excluded), `monthly_revenue` (`month`, `invoiced`, `collected`), `overdue_invoices` (past due with money owed, incl. partially paid, with `days_overdue`).

**Row Level Security** (migration 5): admin/staff read+write everything (deletes: admin only); customers read only their own customer, subscriptions, quotations/invoices (not drafts) and payments, plus active products/plans; anon gets nothing; a user cannot change their own role (only admin can).

## 3. Shared TypeScript contracts (`src/types`, import from `@/types`)

| Concept | Values |
|---|---|
| `UserRole` | `admin` `staff` `customer` |
| `SubscriptionStatus` | `draft` `trialing` `active` `paused` `past_due` `cancelled` `expired` |
| `QuotationStatus` | `draft` `sent` `accepted` `rejected` `expired` `converted` |
| `InvoiceStatus` | `draft` `open` `partially_paid` `paid` `overdue` `void` |
| `PaymentStatus` | `pending` `succeeded` `failed` `refunded` |
| `PaymentMethod` | `card` `upi` `bank_transfer` `cash` `cheque` `other` |
| `BillingInterval` | `week` `month` `quarter` `year` |
| `CustomerStatus` | `active` `inactive` |

Allowed transitions (enforced by the owner's API):
- Subscription: `draft→trialing\|active` (activate) · `active\|trialing→paused` (pause) · `paused→active` (resume) · any live state→`cancelled` (cancel, optionally at period end) · `active→past_due` (unpaid invoice, set by M3 via M2 API) · `→expired`.
- Quotation: `draft→sent→accepted\|rejected\|expired`; `accepted→converted`.
- Invoice: `draft→open` (issue) · `open→partially_paid→paid` (via payments only) · `open\|partially_paid→overdue` · `draft\|open→void`.

Files: `enums.ts` (const arrays + union types) · `entities.ts` (row types) · `schemas.ts` (Zod request schemas, used by API **and** React Hook Form via `@hookform/resolvers/zod`) · `api.ts` (envelopes, request/response types). **Never redefine these types elsewhere.**

Shared helpers: `calcLine` / `calcTotals` / `toMonthly` in `src/lib/money.ts` (all totals, everywhere, must use them – gross = qty×price, discount first, tax on discounted amount, 2-decimal rounding per line) · `addInterval` / `addDays` / `todayISO` in `src/lib/billing-period.ts` · `authorize`, `parseBody`, `parseQuery` in `src/lib/api/guard.ts` · `ok`, `list`, `fail`, `fromSupabaseError`, `toRange` in `src/lib/api/respond.ts` · `StatusBadge`, `PageHeader` components.

## 4. API contracts

Envelopes: success `{ "data": T }` · list `{ "data": T[], "meta": { "page", "page_size", "total" } }` · error `{ "error": { "code", "message", "details?" } }` with codes `UNAUTHENTICATED`(401) `FORBIDDEN`(403) `NOT_FOUND`(404) `VALIDATION_ERROR`(422) `CONFLICT`(409) `INVALID_STATE`(409) `NOT_IMPLEMENTED`(501) `INTERNAL_ERROR`(500). List endpoints accept `?page=1&page_size=20&search=&status=`. Every route starts with `authorize([...roles])`. **All routes currently exist as stubs returning 501**; owners replace them.

Roles column: A = admin, S = staff, C = customer (own records only).

| Method & path | Request body (schema) | Response (`@/types`) | Roles | Owner |
|---|---|---|---|---|
| GET `/api/health` | – | `HealthReport` (not wrapped) | public | shared |
| GET `/api/auth/me` | – | `MeResponse` | A S C | M1 |
| GET `/api/users` | – | `ApiList<Profile>` | A | M1 |
| GET, PATCH `/api/users/:id` | `updateUserSchema` | `ApiOk<Profile>` | A | M1 |
| GET `/api/customers` · POST | `createCustomerSchema` | `CustomerListResponse` · `CustomerResponse` (201) | A S | M1 |
| GET, PATCH, DELETE `/api/customers/:id` | `updateCustomerSchema` | `CustomerResponse` (DELETE: A) | A S | M1 |
| GET, POST `/api/products` · GET, PATCH, DELETE `/api/products/:id` | `createProductSchema` / `updateProductSchema` | `ProductResponse`, `ProductListResponse` | read: all; write: A S | M1 |
| GET, POST `/api/plans` · GET, PATCH, DELETE `/api/plans/:id` | `createPlanSchema` / `updatePlanSchema` | `PlanResponse`, `PlanListResponse` | read: all; write: A S | M1 |
| GET, POST `/api/subscriptions` | `createSubscriptionSchema` | `SubscriptionListResponse` · `SubscriptionResponse` (201) | A S (GET also C) | M2 |
| GET, PATCH `/api/subscriptions/:id` | `updateSubscriptionSchema` | `SubscriptionResponse` | A S (GET also C) | M2 |
| POST `/api/subscriptions/:id/transition` | `{ action: activate\|pause\|resume\|cancel, at_period_end? }` | `SubscriptionResponse` | A S | M2 |
| GET, POST `/api/quotations` | `createQuotationSchema` | `QuotationListResponse` · `QuotationResponse` (201) | A S (GET also C, non-draft) | M2 |
| GET, PATCH `/api/quotations/:id` | `updateQuotationSchema` (draft only) | `QuotationResponse` | A S | M2 |
| POST `/api/quotations/:id/transition` | `{ action: send\|accept\|reject }` | `QuotationResponse` | A S | M2 |
| POST `/api/quotations/:id/convert` | `convertQuotationSchema` | `ConvertQuotationResponse` | A S | M2 |
| GET, POST `/api/invoices` | `createInvoiceSchema` | `InvoiceListResponse` · `InvoiceResponse` (201) | A S (GET also C, non-draft) | M3 |
| GET, PATCH `/api/invoices/:id` | `updateInvoiceSchema` (draft only) | `InvoiceResponse` | A S | M3 |
| POST `/api/invoices/:id/transition` | `{ action: issue\|void }` | `InvoiceResponse` | A S | M3 |
| POST `/api/invoices/generate` | `{ subscription_id, issue_date? }` – builds the invoice for the subscription's current period from its items, advances `next_billing_date`; idempotent per period | `InvoiceResponse` | A S | M3 |
| POST `/api/invoices/mark-overdue` | – | `MarkOverdueResponse` | A S | M3 |
| GET, POST `/api/payments` | `createPaymentSchema` | `PaymentListResponse` · `PaymentResponse` (201) | A S (GET also C) | M3 |
| GET `/api/payments/:id` · POST `/api/payments/:id/refund` | – | `PaymentResponse` | A S | M3 |
| GET `/api/dashboard/summary` | – | `DashboardSummaryResponse` | A S | M4 |
| GET `/api/analytics/revenue?from&to` | – | `RevenueResponse` | A S | M4 |
| GET `/api/analytics/mrr-by-plan` | – | `MrrByPlanResponse` | A S | M4 |
| GET `/api/analytics/subscription-status` | – | `SubscriptionStatusResponse` | A S | M4 |
| GET `/api/portal/overview` | – | `PortalOverviewResponse` (the signed-in customer's data) | C | M4 |

Need an endpoint or field that is not listed? Open a PR changing this file first (backward-compatible: add, don't rename).

## 5. Ownership

| Member | Branch | Owns (only edit these) |
|---|---|---|
| 1 – Auth, roles, customers, products, plans | `feature/auth-data` | `src/features/auth-data/**`, `src/lib/auth/**`, `src/middleware.ts`, `src/app/auth/**`, `src/app/(app)/{customers,products,plans,users}/**`, `src/app/api/{auth,users,customers,products,plans}/**` |
| 2 – Subscriptions, quotations, lifecycle | `feature/subscriptions` | `src/features/subscriptions/**`, `src/app/(app)/{subscriptions,quotations}/**`, `src/app/api/{subscriptions,quotations}/**` |
| 3 – Billing, invoices, payments, tax, discounts, overdue (**Team Lead**) | `feature/billing` | `src/features/billing/**`, `src/app/(app)/{invoices,payments}/**`, `src/app/api/{invoices,payments}/**`; **plus all SHARED files** (merge gatekeeper) |
| 4 – Dashboard, analytics, portal, revenue intelligence | `feature/frontend-intelligence` | `src/features/intelligence/**`, `src/app/(app)/{dashboard,analytics}/**`, `src/app/portal/**`, `src/app/api/{dashboard,analytics,portal}/**` |

SHARED (changed only by PR to `main`, backward-compatible): `src/types/**`, `src/lib/**` (except `lib/auth`), `src/components/**`, `src/config/**`, `src/app/{layout,page}.tsx`, `src/app/globals.css`, `src/app/(app)/layout.tsx`, `src/app/health/**`, `src/app/api/health/**`, `supabase/**`, `CONTRACTS.md`, `README.md`, root config files, `package.json`.

Menu entries: edit your own `src/features/<module>/nav.ts`. Table writes: only the owner's module writes its tables; others read them.

## 6. Calling another member's module

1. Prefer the **HTTP API contract** (section 4) from UI code (`fetch('/api/...')`) – types come from `@/types`.
2. Server code may import another module only through its `src/features/<module>/index.ts` public exports – never deep paths.
3. Reading another module's tables with RLS is allowed (dashboards need it); **writing** to them is not – call their endpoint.
4. Cross-module flows: M2 `convert` creates the subscription itself; M3 `generate` reads a subscription and its items (read-only) and writes only invoices; when an invoice becomes overdue M3 asks M2's `transition` endpoint to set `past_due`.
5. If the other module is not ready, code against the contract type and use a local mock **inside your own `src/features/<you>/` folder**; delete it when the real endpoint lands. Never fake data in shared folders.
6. Never add duplicate types, enums, tables or columns. Need a schema change? Add a **new** migration file (section 9), never edit an applied one.

## 7. Run locally

```bash
npm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                     # http://localhost:3000  (health: /health)
npm run typecheck && npm run lint && npm run build   # run before every PR
```

## 8. Environment variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | anon / publishable key (safe only because RLS is on) |

`.env.local` is git-ignored; only `.env.example` is committed. Do **not** use or commit the `service_role` key.

## 9. Database migrations

Every member points `.env.local` at the **same shared Supabase project** (or each at their own project, applying the same files). Apply, in order:

- **SQL editor (simplest):** paste and run `supabase/migrations/*.sql` files `…01` to `…06`, then optionally `supabase/seed.sql`.
- **CLI:** `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.

New change after merge → new file `supabase/migrations/YYYYMMDDHHMMSS_<module>_<what>.sql` (timestamp later than all existing files). Never edit a migration that is on `main`. Tell the team in chat when you add one.

One-time manual setup: create the first admin (README step 4) and, for the demo, turn **off** "Confirm email" in Supabase Auth settings.

## 10. Git and integration rules

- `main` = always builds. Nobody pushes to `main` directly; open a PR, Team Lead (Member 3) merges.
- Work only on your branch; commit small and often; `git pull --rebase origin main` at least every hour.
- Before a PR: `npm run typecheck && npm run lint && npm run build` must pass.
- Merge order for integration: M1 (data) → M2 (subscriptions) → M3 (billing) → M4 (intelligence). Merge a branch as soon as it is green; do not hoard.
- Touching a file you do not own (including shared ones) → ask the owner/Team Lead; if urgent, make a tiny separate PR with only that change.
- No secrets in Git. Commit messages: `feat(subscriptions): …`, `fix(billing): …`.
- Hackathon freeze: stop merging features 45 minutes before the demo; the last 45 minutes are for integration bugs and demo data only.
