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

## 3. Run

```bash
npm run dev          # http://localhost:3000
```

Open **http://localhost:3000/health** – it shows whether the env vars are set and whether Supabase and the schema are reachable. Without `.env.local` the app still runs (health shows "not configured").

Scripts: `npm run typecheck` · `npm run lint` · `npm run build` · `npm run start` · `npm test` (unit tests) · `npm run test:db` (billing end-to-end test on an in-memory Postgres; first run `npm install --no-save @electric-sql/pglite`).
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
