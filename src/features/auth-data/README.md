# Authentication and users (auth-data)

Sign in, register, forgot / reset password, sign out, route guards, the signed-in user's profile, and user and role management.

## What is where

| Piece | File |
|---|---|
| Sign in (with `?next=` return and "password updated" notice) | `src/app/auth/login/page.tsx` |
| Register | `src/app/auth/register/page.tsx` |
| Forgot password (sends the email) | `src/app/auth/forgot-password/page.tsx` |
| Reset password (page the email link opens) | `src/app/auth/reset-password/page.tsx` |
| Route rules (pure, unit-tested) | `src/lib/auth/guards.ts` |
| Middleware that applies the rules | `src/lib/auth/middleware-guard.ts`, `src/middleware.ts` |
| `GET /api/auth/me` | `src/app/api/auth/me/route.ts` |
| `GET /api/users`, `GET` and `PATCH /api/users/:id` (admin only) | `src/app/api/users/` |
| Users screen (search, role filter, change role) | `src/features/auth-data/components/users-manager.tsx`, `src/app/(app)/users/page.tsx` |
| Sign-out button (in the staff sidebar) | `src/features/auth-data/components/sign-out-button.tsx` |

## Customers, products and plans

`GET`/`POST /api/customers|products|plans` and `GET`/`PATCH`/`DELETE /api/<name>/:id`, with `?page=&page_size=&search=&status=` (plans also `?product_id=`). Staff and admin can read and write customers; products and plans can be read by any signed-in user (customers only see active ones) and written by staff and admin. Only admins can delete, and a row used elsewhere returns `409` with advice to mark it inactive. All of it is built by one small factory, `src/features/auth-data/crud.ts`, configured in `resources.ts`; the three screens share `components/resource-manager.tsx`.

## Route rules

| Visitor | Can open | Is sent to |
|---|---|---|
| Not signed in | `/auth/*`, `/health` | `/auth/login?next=<page they wanted>` for everything else |
| Signed in, any role | `/auth/forgot-password`, `/auth/reset-password` | `/auth/login` and `/auth/register` send them to their home page |
| customer | `/portal` and below | everything else goes to `/portal` |
| staff | all staff pages | `/portal` and `/users` go to `/dashboard` |
| admin | all staff pages including `/users` | `/portal` goes to `/dashboard` |

`/` sends each role to its home page (`/dashboard` for staff and admin, `/portal` for customers). API routes are not redirected; they answer `401` or `403` themselves. The middleware is only the first layer: every API route still calls `authorize()` and Postgres Row Level Security still decides which rows a user can see.

`?next=` accepts only a relative path on this site, so it cannot be used to send someone to another website.

If Supabase cannot be reached, pages still load instead of redirecting in a loop.

## Users API

- `GET /api/users?page=&page_size=&search=&role=` returns `ApiList<Profile>`. Admin only.
- `GET /api/users/:id` returns one profile. Admin only.
- `PATCH /api/users/:id` with `{ "full_name"?, "role"? }`. Admin only. An admin cannot change their own role (`409 INVALID_STATE`), so there is always at least one admin.

New sign-ups are always `customer` (a database trigger does this; the role is never read from the sign-up form). The first admin is made in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## One-time Supabase setup for password reset

1. Open the Supabase dashboard, then **Authentication → URL Configuration**.
2. **Site URL**: `http://localhost:3000` while developing (use the port your dev server prints; use your real address after deploying).
3. **Redirect URLs → Add URL**: `http://localhost:3000/auth/reset-password`. If your dev server runs on another port (for example 3001), add that one too: `http://localhost:3001/auth/reset-password`. Save.
4. Open the reset link in the **same browser** that asked for it. The link works once and expires after about an hour.

Test the whole flow: sign-in page → *Forgot password?* → enter email → open the email → choose a new password → you land on the sign-in page with "Your password was updated" → sign in.

Supabase's built-in email service only sends a few emails per hour. If the email does not arrive, wait a while, check spam, and look under **Authentication → Logs**.

## "Failed to fetch" on forgot password / sign in

That message means the browser could not reach Supabase at all. Check in order:

1. `.env.local` is in the project root (next to `package.json`) and has both lines filled with the real values from **Project Settings → API**: `NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co` (starts with `https://`, no trailing slash, no quotes) and `NEXT_PUBLIC_SUPABASE_ANON_KEY=` the **anon / publishable** key. Never use the `service_role` or secret key.
2. **Stop the dev server (Ctrl+C) and start it again.** Changes to `.env.local` are only read at start-up.
3. Open the Project URL in a browser tab. A small JSON reply means the project is reachable. If it does not load, the project may be paused (free projects pause after inactivity: press *Restore* in the dashboard) or the URL has a typo.
4. Open `/health` in the app. It reports whether the app can reach Supabase and whether the tables exist.
5. Browser extensions (ad blockers, privacy tools) and some college or office networks block `*.supabase.co`. Try a private window with extensions off, or another network.

## Tests

`npx tsx --test src/lib/auth/guards.test.ts src/features/auth-data/users.test.ts src/features/auth-data/crud.test.ts` covers the route rules (every role against every kind of page), the safe `?next=` check, the users query and the self-role-change rule. (Billing adds an `npm test` script that runs these too once the branches are merged.)
