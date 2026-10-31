# SubscriptIQ

Subscription management system (hackathon build). Next.js 15 · TypeScript · Tailwind 4 · shadcn/ui · Supabase · Zod · React Hook Form · Recharts · Lucide.

**Read [CONTRACTS.md](./CONTRACTS.md) first** – it defines folders, database, types, API endpoints, ownership and Git rules.

| Member | Branch |
|---|---|
| 1 – Auth, customers, products, plans | `feature/auth-data` |
| 2 – Subscriptions, quotations | `feature/subscriptions` |
| 3 – Billing, invoices, payments (Team Lead) | `feature/billing` |
| 4 – Dashboard, analytics, portal | `feature/frontend-intelligence` |

## 1. Get the code

```bash
git clone https://github.com/arunimanithin/subscription-management-system.git
cd subscription-management-system
git checkout feature/<your-branch>      # see table above
npm install
```

Requires Node.js 20+ (built and verified on Node 22).

## 2. Configure Supabase (once per Supabase project – Team Lead does this, shares the URL + anon key)

1. Create a project at supabase.com.
2. **Project Settings → API**: copy *Project URL* and the *anon* (publishable) key.
3. **SQL Editor**: run the six files in `supabase/migrations/` in filename order, then (optional) `supabase/seed.sql`.
4. **Authentication → Providers → Email**: for the demo turn **off** "Confirm email" so sign-up works immediately.
5. Sign up one user through the app (or Authentication → Users → Add user), then make them admin in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   New sign-ups are always `customer`. To give a customer portal access, an admin/staff sets `customers.user_id` to that user's profile id.
6. Locally: `cp .env.example .env.local` (PowerShell: `Copy-Item .env.example .env.local`) and fill in the two values. **Never** put the `service_role` key anywhere in this project.

## 2b. Shared demo data (optional – everyone tests against the same data)

`supabase/seed-demo.sql` loads realistic, clearly labelled **demo** data so every member can build and test their module without typing records by hand: 12 customers (1 inactive), 7 products, 9 plans (weekly/monthly/quarterly/yearly, 1 inactive), 12 subscriptions (active, trialing, past due, paused, cancelled, expired), 6 quotations (draft → converted), 67 invoices with line items (draft, open, partially paid, paid, overdue, void; percentage **and** fixed discounts; 0/5/12/18 % tax) and 67 payments (full, partial, several per invoice, failed, pending, refunded) spread over the last 12 months, so MRR, revenue trends, customer/subscription growth, outstanding and overdue amounts and recent payments all have data.

**Safe by design:** demo rows have fixed ids (`de00000X-…`), numbers like `INV-DEMO-001`, names ending in "(Demo)" and e-mails ending in `@demo.subscriptiq.test`. Running the script again creates **no duplicates**. It never changes or deletes anything that is not demo data. No passwords, tokens or service-role keys are in it. **Development projects only – never run it on production.**

**Team Lead, once per Supabase project:**
1. In **Authentication → Users → Add user** (tick *Auto Confirm User*) create these six users, all with the same development password you choose (share it with the team in chat, never in Git):

   | E-mail | Role after the seed | Use it to test |
   |---|---|---|
   | `admin@demo.subscriptiq.test` | admin | everything, including deletes and user management |
   | `staff1@demo.subscriptiq.test`, `staff2@demo.subscriptiq.test` | staff | day-to-day work (create/edit, no deletes) |
   | `customer1@demo.subscriptiq.test` | customer, linked to *Aarav Textiles (Demo)* | portal: sees only its own subscription, invoices and payments |
   | `customer2@demo.subscriptiq.test` | customer, linked to *Kerala Spice Co (Demo)* | portal (a second customer, to check isolation) |
   | `customer3@demo.subscriptiq.test` | customer, linked to *Nila Digital Studio (Demo)* | portal |

2. **SQL Editor** → paste the whole of `supabase/seed-demo.sql` → Run. It ends with a notice such as `Demo data present: 12 customers, 12 subscriptions, 67 invoices, 67 payments`. (If it says some demo users are missing, create them and run the script again – roles and links are applied then.)
3. Tell the team the data is in. Everyone signs in at the app with the accounts above. Nobody else needs to run anything.

**What to try per module:** Member 1 – customers (one is inactive), products and plans (one inactive plan). Member 2 – subscriptions in every status and quotations in every status (`QUO-DEMO-06` is already converted to `SUB-DEMO-03`). Member 3 – invoices in every status, multi-payment and refunded/failed/pending payments; `SUB-DEMO-03` and `SUB-DEMO-04` are due today, so *Run recurring billing* creates two invoices. Member 4 – the views `monthly_revenue`, `subscription_item_mrr`, `overdue_invoices` and the customer/subscription growth data.

To remove the demo data later, run `supabase/unseed-demo.sql` (it deletes only demo rows, including invoices or payments teammates created on them; delete the six demo users in Authentication → Users by hand). If your Supabase rejects the `.test` e-mail domain, replace `demo.subscriptiq.test` with another domain throughout the file before running.

## 3. Run

```bash
npm run dev          # http://localhost:3000
```

Open **http://localhost:3000/health** – it shows whether the env vars are set and whether Supabase and the schema are reachable. Without `.env.local` the app still runs (health shows "not configured").

Scripts: `npm run typecheck` · `npm run lint` · `npm run build` · `npm run start`.
Add a shadcn component: `npx shadcn@latest add dialog` (config in `components.json`).

## 4. What exists right now

- Working app shell (sidebar, placeholder page per module), health page, `/api/health`.
- 501 stubs for every endpoint in CONTRACTS.md section 4 – replace the ones you own.
- Shared types/Zod schemas, money and billing-date helpers, API guard/response helpers, Supabase clients.
- Database schema with RLS, payment→invoice sync trigger and analytics views.

## 5. Daily workflow

```bash
git pull --rebase origin main      # at least hourly
# ...work only in your own folders...
npm run typecheck && npm run lint && npm run build
git add -A && git commit -m "feat(<module>): ..." && git push origin feature/<your-branch>
# open a Pull Request into main; Team Lead merges
```

## 6. Troubleshooting

- `/health` says *invalid key* → wrong anon key or URL in `.env.local`; restart `npm run dev` after editing it.
- `/health` says *schema missing* → migrations not run in this Supabase project.
- Sign-up works but you see nothing → your profile is `customer`; promote yourself (step 2.5).
- Empty lists for a customer user → customer rows are only visible once `customers.user_id` links them.

## 7. What has been verified (and what has not)

Verified on the foundation commit: `npm install`, `tsc --noEmit`, `eslint`, `next build`; the six migrations and seed were applied to an in-memory PostgreSQL 17 (PGlite) with stubbed Supabase `auth` objects and exercised: auto profile creation, partial/full payment and refund → invoice status, overpayment and draft-payment rejection, duplicate-period invoice rejection, overdue/MRR/revenue views, and RLS for customer / staff / admin / anon.

**Not verified:** any live Supabase project, Supabase Auth sign-up/login flows, and `supabase db push`. Treat these as untested until your first run – `/health` is the quick check.
