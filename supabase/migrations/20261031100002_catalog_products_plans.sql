-- 2/6  Catalogue: products and plans. Owner after foundation: Member 1.

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  sku          text unique,
  description  text,
  category     text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_active_idx on public.products (is_active);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.plans (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete restrict,
  name              text not null check (length(trim(name)) > 0),
  description       text,
  price             numeric(12,2) not null check (price >= 0),
  currency          text not null default 'INR' check (char_length(currency) = 3),
  billing_interval  text not null default 'month' check (billing_interval in ('week', 'month', 'quarter', 'year')),
  interval_count    integer not null default 1 check (interval_count > 0),
  trial_days        integer not null default 0 check (trial_days >= 0),
  setup_fee         numeric(12,2) not null default 0 check (setup_fee >= 0),
  tax_rate          numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index plans_product_idx on public.plans (product_id);
create index plans_active_idx on public.plans (is_active);
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
