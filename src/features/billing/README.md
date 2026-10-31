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
