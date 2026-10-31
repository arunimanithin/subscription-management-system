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

`supabase/seed-demo.sql` loads a small fictional business so every member can build and test their module with data that behaves like the real thing, instead of typing records by hand:

- **12 customers** across Kerala, Karnataka, Tamil Nadu, Maharashtra and Telangana, each with a named contact person, address and GSTIN-style tax id (one customer is inactive).
- **7 products and 9 plans** (weekly / monthly / quarterly / yearly; 5 %, 12 %, 18 % and 0 % GST; one retired product and plan).
- **12 subscriptions** in every status (active, trialing, past due, paused, cancelled, expired) with realistic histories: a price rise (old invoices keep the old price), seats growing from 3 to 5, a 20 % launch offer, a negotiated annual discount, one-time setup fees.
- **6 quotations** (draft, sent, accepted, rejected, expired, converted – `QUO-DEMO-06` became `SUB-DEMO-03`).
- **67 invoices with line items** over 12 months in every status (draft, open, partially paid, paid, overdue, void), with percentage **and** fixed discounts, and **67 payments** that follow each customer's habits: autopay customers pay within a day or two, some pay NEFT on net-30 terms, one customer pays late, one pays by cheque; includes a payment in two instalments, a failed card attempt, a pending bank transfer and a duplicate payment that was refunded. References look real (UPI ref, bank UTR, gateway id, cheque number).
- Enough history for MRR, revenue trends, collected vs outstanding, overdue ageing, customer and subscription growth, and recent payments.

**Safe by design:** demo rows have fixed ids (`de00000X-…`) and numbers like `INV-DEMO-001`, `SUB-DEMO-03`. Every e-mail address uses `example.com` (it can never receive mail). Running the script again creates **no duplicates**, and it never changes or deletes anything that is not demo data (your own admin account is left alone; the seeded records are attributed to the oldest admin). It contains no passwords, tokens or service-role keys, and aborts (rolls back) if any invoice total is inconsistent. **Development projects only – never run it on production.**

**Team Lead, once per Supabase project:**
1. You stay the admin. In **Authentication → Users → Add user** (tick *Auto Confirm User*) create these five users with one development password you choose (share it with the team in chat, never in Git):

   | E-mail | Becomes | Use it to test |
   |---|---|---|
   | `meera.menon@subscriptiq.example.com` | staff – Meera Menon | day-to-day billing work (create/edit, no deletes) |
   | `rahul.varma@subscriptiq.example.com` | staff – Rahul Varma | a second staff member |
   | `priya.nair@aaravtextiles.example.com` | customer – linked to *Aarav Textiles* | the customer portal: sees only its own subscription, invoices and payments |
   | `anil.thomas@keralaspice.example.com` | customer – linked to *Kerala Spice Co* | a second customer, to check isolation |
   | `divya.ramesh@niladigital.example.com` | customer – linked to *Nila Digital Studio* | a third customer |

2. **SQL Editor** → paste the whole of `supabase/seed-demo.sql` → Run. It ends with a notice such as `Demo data present: 12 customers, 12 subscriptions, 67 invoices, 67 payments`. (If it says some demo users are missing, create them and run the script again – names, roles and links are applied then.)
3. Tell the team the data is in. Everyone signs in with the accounts above (or their own admin account). Nobody else needs to run anything.

**What to try per module:** Member 1 – customers (one inactive), products and plans (one retired). Member 2 – subscriptions in every status and quotations in every status. Member 3 – invoices in every status, multi-payment, failed, pending and refunded payments; `SUB-DEMO-03` and `SUB-DEMO-04` are due today, so *Run recurring billing* creates two invoices. Member 4 – the views `monthly_revenue`, `subscription_item_mrr`, `overdue_invoices` and the customer/subscription growth data.

To remove the demo data later, run `supabase/unseed-demo.sql` (it deletes only demo rows, including invoices or payments teammates created on them; delete the five demo users in Authentication → Users by hand). If your Supabase rejects the `example.com` addresses, replace that domain throughout the file with another before running.

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
