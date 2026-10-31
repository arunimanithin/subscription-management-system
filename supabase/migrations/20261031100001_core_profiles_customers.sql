-- 1/6  Core: updated_at helper, profiles (roles), customers, role helper functions.
-- Owner of these tables after foundation: Member 1.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'customer' check (role in ('admin', 'staff', 'customer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a profile with role 'customer'.
-- The role is NEVER read from client-supplied metadata (prevents self-promotion).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- customers
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references public.profiles(id) on delete set null,
  name           text not null check (length(trim(name)) > 0),
  email          text,
  phone          text,
  company        text,
  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  postal_code    text,
  country        text not null default 'IN',
  tax_id         text,
  notes          text,
  status         text not null default 'active' check (status in ('active', 'inactive')),
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index customers_email_key on public.customers (lower(email)) where email is not null;
create index customers_name_idx on public.customers (lower(name));
create index customers_status_idx on public.customers (status);
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------- RLS helper functions
-- SECURITY DEFINER so policies can read profiles/customers without recursing into their own RLS.
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('admin', 'staff'), false)
$$;

create or replace function public.current_customer_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.customers where user_id = auth.uid() limit 1
$$;

revoke execute on function public.current_user_role(), public.is_admin(), public.is_staff(), public.current_customer_id() from public, anon;
grant execute on function public.current_user_role(), public.is_admin(), public.is_staff(), public.current_customer_id() to authenticated;
