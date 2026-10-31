-- 6/6  Read-only analytics views for Member 4 (and overdue tracking for Member 3).
-- security_invoker = true => the caller's RLS applies (needs Postgres 15+, default on Supabase).
-- Single-currency assumption (INR): amounts of different currencies are NOT converted.

-- One row per subscription item with its monthly-recurring value (tax excluded).
create view public.subscription_item_mrr with (security_invoker = true) as
select
  s.id                     as subscription_id,
  s.customer_id,
  s.status,
  i.plan_id,
  s.currency,
  round(
    i.quantity * i.unit_price * (1 - i.discount_percent / 100.0)
    * (case s.billing_interval
         when 'week'    then 52.0 / 12
         when 'month'   then 1.0
         when 'quarter' then 1.0 / 3
         when 'year'    then 1.0 / 12
       end)
    / s.interval_count
  , 2)                     as mrr
from public.subscriptions s
join public.subscription_items i on i.subscription_id = s.id;

-- Invoiced (by issue month) vs collected (by payment month).
create view public.monthly_revenue with (security_invoker = true) as
with invoiced as (
  select date_trunc('month', issue_date)::date as month, sum(total) as amount
  from public.invoices
  where status not in ('draft', 'void')
  group by 1
), collected as (
  select date_trunc('month', paid_at)::date as month, sum(amount) as amount
  from public.payments
  where status = 'succeeded'
  group by 1
)
select
  coalesce(i.month, c.month)  as month,
  coalesce(i.amount, 0)       as invoiced,
  coalesce(c.amount, 0)       as collected
from invoiced i
full join collected c on c.month = i.month;

-- Every invoice that is past due and still owes money (includes partially paid ones).
create view public.overdue_invoices with (security_invoker = true) as
select
  id, invoice_number, customer_id, subscription_id, status, due_date,
  total, amount_paid, amount_due, currency,
  (current_date - due_date) as days_overdue
from public.invoices
where status in ('open', 'partially_paid', 'overdue')
  and due_date < current_date
  and amount_due > 0;
