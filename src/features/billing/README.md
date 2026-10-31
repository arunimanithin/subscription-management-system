# Billing module (Member 3)

Branch `feature/billing`. Owns `src/features/billing/**`, `src/app/(app)/{invoices,payments}/**`, `src/app/api/{invoices,payments}/**`.

## Part 1 – Invoice generation (done)

| What | Where |
|---|---|
| Atomic create (invoice + items in one transaction) | `supabase/migrations/20261031110001_billing_create_invoice_rpc.sql` → `create_invoice_with_items` |
| Payload builder (pure, tested) | `invoices/build-invoice.ts` |
| Supabase access | `invoices/service.ts` (`createInvoice`, `getInvoice`, `listInvoices`) |
| API | `GET/POST /api/invoices`, `GET /api/invoices/:id` (`PATCH` still 501) |
| UI | `/invoices`, `/invoices/new`, `/invoices/[id]` |
| Tests | `invoices/build-invoice.test.ts` – run `npm test` |

### Calculation order (single implementation: `src/lib/money.ts`)
1. `gross = quantity × unit_price` (rounded to 2 decimals)
2. `discount = gross × discount_percent ÷ 100`
3. `taxable = gross − discount`
4. `tax = taxable × tax_rate ÷ 100`
5. `line_total = taxable + tax`

Every amount is rounded to 2 decimals **per line**; document totals are sums of the rounded lines, so
`total = subtotal − discount_total + tax_total` always holds exactly. Amounts are computed on the server;
the browser's preview is informational only. The database function re-checks that header totals match
the lines and rejects the invoice otherwise.

### Snapshots
`description`, `unit_price`, `discount_percent` and `tax_rate` are copied onto each invoice line at
creation. Editing a plan or product later never changes an existing invoice.

### Notes
- New invoices are always `draft`. Issuing (draft → open) arrives with the status transitions.
- Invoice numbers (`INV-000001`…) come from a database sequence: unique, but a failed attempt can leave a gap.
- `/dev/sign-in` is a **temporary** development-only page, until Member 1's `/auth/login` is merged. Delete
  `src/app/dev/`, `components/dev-sign-in.tsx` and the link in `components/auth-notice.tsx` afterwards.

## Part 2 – Payments
- `record_payment` (migration `20261031120001`) is atomic: locks the invoice, blocks overpayment, supports idempotency keys (duplicate click / retry safe).
- Payments only allowed on `open`, `partially_paid`, `overdue` invoices; invoice status/`amount_paid` are recomputed by the existing DB trigger.
- Refund: `POST /api/payments/:id/refund` (succeeded → refunded; invoice balance reopens).
- Issue invoice: `POST /api/invoices/:id/transition {action:"issue"}` (draft → open; zero-total invoices refused).
- UI: record-payment form + refund buttons on the invoice page (admin/staff only), `/payments` history with status filter and pagination.
- Customers cannot create payments (staff-only); a customer "pay now" flow is a later decision.

## Part 3 – Lifecycle, overdue tracking, filters, fixed discounts
- Migration `20261031130001_billing_lifecycle.sql`: `void_invoice`, `mark_overdue_invoices`, `update_draft_invoice`, and an updated `recompute_invoice_payment_state` (a partially paid invoice past its due date stays `overdue`).
- Void: only draft/open/overdue invoices with no payments (refund first). Reason is appended to the notes. Voided invoices cannot be paid or edited.
- Overdue: "Update overdue" button (or `POST /api/invoices/mark-overdue`) flags past-due invoices; the list also shows "Nd overdue" and the `overdue` filter is accurate even before the sweep runs.
- Filters on `/invoices` and `GET /api/invoices`: status, customer, search, issue/due date ranges.
- Fixed-amount discount per line ("Or fixed discount" in the invoice form), alternative to the percentage; rules live in `src/lib/money.ts`.
- `PATCH /api/invoices/:id` edits drafts (API only; there is no edit screen yet).
- Recurring generation (`/api/invoices/generate`) is Part 4 and still returns 501.

## Part 4 – Recurring billing
- Migration `20261031140001_billing_recurring.sql`: `generate_subscription_invoice` – one period of one subscription, invoice + issue + subscription date advance in a single transaction; row-locked, idempotent per period.
- `recurring/plan.ts` (pure, tested): decides eligibility, the period and the amounts using `src/lib/money.ts` and `src/lib/billing-period.ts`. `recurring/service.ts`: `generateInvoiceForSubscription`, `runRecurringBilling` (exported from the module index so Member 2 can add a "bill now" button on the subscription page).
- API: `POST /api/invoices/generate` (one subscription), `POST /api/invoices/generate-due` (everything due). UI: **Run recurring billing** button on `/invoices`.
- Convention (period starts on `next_billing_date`, inclusive dates, billed in advance, due in 14 days) is documented in CONTRACTS.md for Member 2.
- Not automatic: nothing runs on a timer yet. Call `generate-due` from the button, or schedule it (Vercel Cron / Supabase pg_cron) – a deployment decision.
