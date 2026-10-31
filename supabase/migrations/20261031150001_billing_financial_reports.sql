-- Billing Part 5: financial reporting for the billing dashboard.
-- Two read-only functions that aggregate IN THE DATABASE, so the figures are exact no matter how many
-- rows exist (the REST API would silently cap a client-side sum at the row limit).
-- SECURITY INVOKER: the caller's RLS applies (the API routes only allow admin/staff; a customer who
-- called the function directly would only ever aggregate their own rows). No service-role key.
--
-- Definitions (also in src/features/billing/README.md):
--   billed       sum(total) of invoices issued in the period, excluding draft and void
--   collected    sum of SUCCEEDED payments made in the period (by UTC payment date)
--   refunded     sum of payments now marked 'refunded' that were made in the period
--   outstanding  amount_due of every open / partially_paid / overdue invoice, as of today (not period-bound)
--   overdue      the part of outstanding whose due_date is before today
-- Amounts of different currencies are NEVER added together: every figure is reported per currency.

create or replace function public.billing_financial_summary(
  p_from date default null,
  p_to   date default null
) returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with
inv as (
  select * from public.invoices
   where (p_from is null or issue_date >= p_from)
     and (p_to   is null or issue_date <= p_to)
),
pay as (
  select p.*, (p.paid_at at time zone 'utc')::date as paid_day
    from public.payments p
   where (p_from is null or (p.paid_at at time zone 'utc')::date >= p_from)
     and (p_to   is null or (p.paid_at at time zone 'utc')::date <= p_to)
),
agg as (
  select
    k.currency,
    coalesce((select sum(total)       from inv where currency = k.currency and status not in ('draft', 'void')), 0) as billed,
    coalesce((select sum(amount_paid) from inv where currency = k.currency and status not in ('draft', 'void')), 0) as billed_paid,
    coalesce((select sum(amount) from pay where currency = k.currency and status = 'succeeded'), 0) as collected,
    coalesce((select sum(amount) from pay where currency = k.currency and status = 'refunded'),  0) as refunded,
    (select count(*) from pay where currency = k.currency and status = 'failed') as failed_payments,
    coalesce((select sum(amount_due) from public.invoices
               where currency = k.currency and status in ('open', 'partially_paid', 'overdue')), 0) as outstanding,
    (select count(*) from public.invoices
      where currency = k.currency and status in ('open', 'partially_paid', 'overdue')) as open_invoice_count,
    coalesce((select sum(amount_due) from public.invoices
               where currency = k.currency and status in ('open', 'partially_paid', 'overdue')
                 and due_date < current_date), 0) as overdue_amount,
    (select count(*) from public.invoices
      where currency = k.currency and status in ('open', 'partially_paid', 'overdue')
        and due_date < current_date) as overdue_count
  from (select distinct currency from public.invoices) k
)
select jsonb_build_object(
  'from', p_from,
  'to', p_to,
  'as_of', current_date,
  'currencies', coalesce(jsonb_agg(
    jsonb_build_object(
      'currency', a.currency,
      'billed', a.billed,
      'billed_paid', a.billed_paid,
      'collected', a.collected,
      'refunded', a.refunded,
      'failed_payments', a.failed_payments,
      'outstanding', a.outstanding,
      'open_invoice_count', a.open_invoice_count,
      'overdue_amount', a.overdue_amount,
      'overdue_count', a.overdue_count,
      'invoices_by_status', coalesce((
        select jsonb_object_agg(s.status, jsonb_build_object('count', s.n, 'total', s.t))
          from (select status, count(*) as n, coalesce(sum(total), 0) as t
                  from inv where currency = a.currency group by status) s
      ), '{}'::jsonb),
      'payments_by_method', coalesce((
        select jsonb_agg(jsonb_build_object('method', m.method, 'count', m.n, 'amount', m.t) order by m.t desc)
          from (select method, count(*) as n, sum(amount) as t
                  from pay where currency = a.currency and status = 'succeeded' group by method) m
      ), '[]'::jsonb),
      'monthly', coalesce((
        select jsonb_agg(jsonb_build_object('month', x.month, 'billed', x.billed, 'collected', x.collected) order by x.month)
          from (
            select coalesce(i.month, c.month) as month, coalesce(i.amount, 0) as billed, coalesce(c.amount, 0) as collected
              from (select date_trunc('month', issue_date)::date as month, sum(total) as amount
                      from inv where currency = a.currency and status not in ('draft', 'void') group by 1) i
              full join (select date_trunc('month', paid_day)::date as month, sum(amount) as amount
                           from pay where currency = a.currency and status = 'succeeded' group by 1) c
                     on c.month = i.month
          ) x
      ), '[]'::jsonb)
    ) order by a.billed desc
  ), '[]'::jsonb)
)
from agg a;
$$;

create or replace function public.billing_aging(p_as_of date default null) returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with
p as (select coalesce(p_as_of, current_date) as d),
open_inv as (
  select i.currency, i.customer_id, i.amount_due, (p.d - i.due_date) as days,
         case when p.d - i.due_date <= 0  then 'current'
              when p.d - i.due_date <= 30 then '1-30'
              when p.d - i.due_date <= 60 then '31-60'
              when p.d - i.due_date <= 90 then '61-90'
              else '90+' end as bucket
    from public.invoices i, p
   where i.status in ('open', 'partially_paid', 'overdue') and i.amount_due > 0
),
cur as (select distinct currency from open_inv)
select jsonb_build_object(
  'as_of', (select d from p),
  'currencies', coalesce(jsonb_agg(
    jsonb_build_object(
      'currency', c.currency,
      'total_outstanding', (select coalesce(sum(amount_due), 0) from open_inv o where o.currency = c.currency),
      'total_overdue',     (select coalesce(sum(amount_due), 0) from open_inv o where o.currency = c.currency and o.days > 0),
      'buckets', (
        select jsonb_agg(jsonb_build_object('bucket', b.label, 'count', coalesce(x.n, 0), 'amount', coalesce(x.a, 0)) order by b.ord)
          from (values ('current', 1), ('1-30', 2), ('31-60', 3), ('61-90', 4), ('90+', 5)) as b(label, ord)
          left join (select bucket, count(*) as n, sum(amount_due) as a
                       from open_inv o where o.currency = c.currency group by bucket) x
                 on x.bucket = b.label
      ),
      'top_overdue_customers', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'customer_id', t.customer_id, 'customer_name', t.name, 'invoices', t.n,
                 'amount', t.a, 'oldest_days_overdue', t.d) order by t.a desc)
          from (select o.customer_id, cu.name, count(*) as n, sum(o.amount_due) as a, max(o.days) as d
                  from open_inv o join public.customers cu on cu.id = o.customer_id
                 where o.currency = c.currency and o.days > 0
                 group by o.customer_id, cu.name
                 order by sum(o.amount_due) desc
                 limit 5) t
      ), '[]'::jsonb)
    ) order by c.currency
  ), '[]'::jsonb)
)
from cur c;
$$;

revoke execute on function public.billing_financial_summary(date, date) from public, anon;
revoke execute on function public.billing_aging(date) from public, anon;
grant execute on function public.billing_financial_summary(date, date) to authenticated;
grant execute on function public.billing_aging(date) to authenticated;
