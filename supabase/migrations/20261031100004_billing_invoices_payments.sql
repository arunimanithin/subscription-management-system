-- 4/6  Invoices, invoice items, payments. Owner after foundation: Member 3.
-- Invoice items are immutable-by-convention snapshots (description, price, discount, tax).
-- Totals are written by the application using src/lib/money.ts; the database keeps
-- amount_paid / status in sync with payments (partial payments supported).

create sequence public.invoice_number_seq;

create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  invoice_number   text not null unique default ('INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  customer_id      uuid not null references public.customers(id) on delete restrict,
  subscription_id  uuid references public.subscriptions(id) on delete set null,
  status           text not null default 'draft'
                   check (status in ('draft', 'open', 'partially_paid', 'paid', 'overdue', 'void')),
  currency         text not null default 'INR' check (char_length(currency) = 3),
  issue_date       date not null default current_date,
  due_date         date not null default (current_date + 14),
  period_start     date,
  period_end       date,
  subtotal         numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total   numeric(12,2) not null default 0 check (discount_total >= 0),
  tax_total        numeric(12,2) not null default 0 check (tax_total >= 0),
  total            numeric(12,2) not null default 0 check (total >= 0),
  amount_paid      numeric(12,2) not null default 0 check (amount_paid >= 0),
  amount_due       numeric(12,2) generated always as (total - amount_paid) stored,
  paid_at          timestamptz,
  voided_at        timestamptz,
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (due_date >= issue_date),
  check (amount_paid <= total),
  check (period_end is null or period_start is null or period_end >= period_start)
);
create index invoices_customer_idx on public.invoices (customer_id);
create index invoices_subscription_idx on public.invoices (subscription_id);
create index invoices_status_due_idx on public.invoices (status, due_date);
-- Recurring billing must be idempotent: one non-void invoice per subscription period.
create unique index invoices_subscription_period_key on public.invoices (subscription_id, period_start)
  where subscription_id is not null and period_start is not null and status <> 'void';
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_items (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid not null references public.invoices(id) on delete cascade,
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
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);
create trigger invoice_items_set_updated_at before update on public.invoice_items
  for each row execute function public.set_updated_at();

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete restrict,
  customer_id  uuid not null references public.customers(id) on delete restrict,
  amount       numeric(12,2) not null check (amount > 0),
  currency     text not null default 'INR' check (char_length(currency) = 3),
  method       text not null check (method in ('card', 'upi', 'bank_transfer', 'cash', 'cheque', 'other')),
  status       text not null default 'succeeded' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  reference    text,
  paid_at      timestamptz not null default now(),
  notes        text,
  recorded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_customer_idx on public.payments (customer_id);
create index payments_status_paid_idx on public.payments (status, paid_at);
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- customer_id and currency always follow the invoice (callers cannot mismatch them).
create or replace function public.payments_inherit_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_customer uuid; v_currency text; v_status text;
begin
  select customer_id, currency, status into v_customer, v_currency, v_status
  from public.invoices where id = new.invoice_id;
  if not found then
    raise exception 'Invoice % does not exist', new.invoice_id using errcode = '23503';
  end if;
  if tg_op = 'INSERT' and v_status in ('draft', 'void') then
    raise exception 'Cannot record a payment against a % invoice', v_status using errcode = '23514';
  end if;
  new.customer_id := v_customer;
  new.currency := v_currency;
  return new;
end $$;
create trigger payments_inherit_invoice before insert or update of invoice_id on public.payments
  for each row execute function public.payments_inherit_invoice();

-- Keeps invoices.amount_paid / status / paid_at equal to the sum of SUCCEEDED payments.
-- Overpayment is rejected by the invoices.amount_paid <= total check constraint.
-- 'overdue' is set here only for invoices with nothing paid; use the overdue_invoices view
-- (migration 6) to find every past-due invoice, including partially paid ones.
create or replace function public.recompute_invoice_payment_state(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_total numeric(12,2); v_status text; v_due date; v_paid numeric(12,2); v_new text;
begin
  select total, status, due_date into v_total, v_status, v_due
  from public.invoices where id = p_invoice for update;
  if not found or v_status in ('draft', 'void') then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments where invoice_id = p_invoice and status = 'succeeded';

  if v_total > 0 and v_paid >= v_total then v_new := 'paid';
  elsif v_paid > 0 then v_new := 'partially_paid';
  elsif v_due < current_date then v_new := 'overdue';
  else v_new := 'open';
  end if;

  update public.invoices
     set amount_paid = v_paid,
         status = v_new,
         paid_at = case when v_new = 'paid' then coalesce(paid_at, now()) else null end
   where id = p_invoice;
end $$;

create or replace function public.payments_sync_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_invoice_payment_state(old.invoice_id);
    return old;
  end if;
  perform public.recompute_invoice_payment_state(new.invoice_id);
  if tg_op = 'UPDATE' and old.invoice_id <> new.invoice_id then
    perform public.recompute_invoice_payment_state(old.invoice_id);
  end if;
  return new;
end $$;
create trigger payments_sync_invoice after insert or update or delete on public.payments
  for each row execute function public.payments_sync_invoice();

revoke execute on function public.recompute_invoice_payment_state(uuid) from public, anon, authenticated;
