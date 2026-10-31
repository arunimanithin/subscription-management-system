-- 3/6  Subscriptions, subscription items, quotations, quotation items. Owner after foundation: Member 2.
-- Items copy description / price / discount / tax from the plan at creation time (snapshots):
-- editing a plan later never changes an existing subscription, quotation or invoice.

create sequence public.subscription_number_seq;
create sequence public.quotation_number_seq;

-- ----------------------------------------------------------- subscriptions
create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  subscription_number   text not null unique default ('SUB-' || lpad(nextval('public.subscription_number_seq')::text, 6, '0')),
  customer_id           uuid not null references public.customers(id) on delete restrict,
  status                text not null default 'draft'
                        check (status in ('draft', 'trialing', 'active', 'paused', 'past_due', 'cancelled', 'expired')),
  currency              text not null default 'INR' check (char_length(currency) = 3),
  -- One billing cycle per subscription; every item is billed on it.
  billing_interval      text not null default 'month' check (billing_interval in ('week', 'month', 'quarter', 'year')),
  interval_count        integer not null default 1 check (interval_count > 0),
  start_date            date not null default current_date,
  trial_end_date        date,
  current_period_start  date,
  current_period_end    date,
  next_billing_date     date,
  cancel_at_period_end  boolean not null default false,
  paused_at             timestamptz,
  cancelled_at          timestamptz,
  ended_at              timestamptz,
  notes                 text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (trial_end_date is null or trial_end_date >= start_date),
  check (current_period_end is null or current_period_start is null or current_period_end >= current_period_start)
);
create index subscriptions_customer_idx on public.subscriptions (customer_id);
create index subscriptions_status_idx on public.subscriptions (status);
-- Drives the recurring-billing run: "which subscriptions are due?"
create index subscriptions_due_idx on public.subscriptions (next_billing_date)
  where status in ('trialing', 'active', 'past_due');
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.subscription_items (
  id                uuid primary key default gen_random_uuid(),
  subscription_id   uuid not null references public.subscriptions(id) on delete cascade,
  plan_id           uuid references public.plans(id) on delete set null,
  product_id        uuid references public.products(id) on delete set null,
  description       text not null check (length(trim(description)) > 0),
  quantity          numeric(10,2) not null default 1 check (quantity > 0),
  unit_price        numeric(12,2) not null check (unit_price >= 0),
  discount_percent  numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  tax_rate          numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index subscription_items_sub_idx on public.subscription_items (subscription_id);
create index subscription_items_plan_idx on public.subscription_items (plan_id);
create trigger subscription_items_set_updated_at before update on public.subscription_items
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- quotations
create table public.quotations (
  id                uuid primary key default gen_random_uuid(),
  quotation_number  text not null unique default ('QUO-' || lpad(nextval('public.quotation_number_seq')::text, 6, '0')),
  customer_id       uuid not null references public.customers(id) on delete restrict,
  status            text not null default 'draft'
                    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  currency          text not null default 'INR' check (char_length(currency) = 3),
  valid_until       date,
  subtotal          numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total    numeric(12,2) not null default 0 check (discount_total >= 0),
  tax_total         numeric(12,2) not null default 0 check (tax_total >= 0),
  total             numeric(12,2) not null default 0 check (total >= 0),
  notes             text,
  terms             text,
  subscription_id   uuid references public.subscriptions(id) on delete set null,  -- set on conversion
  sent_at           timestamptz,
  accepted_at       timestamptz,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index quotations_customer_idx on public.quotations (customer_id);
create index quotations_status_idx on public.quotations (status);
create trigger quotations_set_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_items (
  id                uuid primary key default gen_random_uuid(),
  quotation_id      uuid not null references public.quotations(id) on delete cascade,
  plan_id           uuid references public.plans(id) on delete set null,
  product_id        uuid references public.products(id) on delete set null,
  description       text not null check (length(trim(description)) > 0),
  quantity          numeric(10,2) not null default 1 check (quantity > 0),
  unit_price        numeric(12,2) not null check (unit_price >= 0),
  discount_percent  numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  tax_rate          numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  discount_amount   numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount        numeric(12,2) not null default 0 check (tax_amount >= 0),
  line_total        numeric(12,2) not null default 0 check (line_total >= 0),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index quotation_items_quotation_idx on public.quotation_items (quotation_id);
create trigger quotation_items_set_updated_at before update on public.quotation_items
  for each row execute function public.set_updated_at();
