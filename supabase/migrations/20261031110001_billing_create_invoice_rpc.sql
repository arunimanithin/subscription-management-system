-- Billing Part 1: atomic invoice creation.
-- supabase-js cannot wrap "insert invoice + insert items" in one transaction, so a failure
-- between the two calls could leave an invoice without items. This function does both in a
-- single transaction. It is SECURITY INVOKER: the caller's RLS applies (only admin/staff can
-- insert invoices) and no service-role key is needed.
--
-- The app computes every amount with src/lib/money.ts. This function does NOT recompute line
-- amounts (JS and SQL could round a half-cent differently); it verifies that the header totals
-- are internally consistent with the lines it was given, so a buggy caller cannot store an
-- invoice whose totals contradict its items.

create or replace function public.create_invoice_with_items(p_invoice jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id        uuid;
  v_subtotal  numeric(12,2) := (p_invoice ->> 'subtotal')::numeric;
  v_discount  numeric(12,2) := (p_invoice ->> 'discount_total')::numeric;
  v_tax       numeric(12,2) := (p_invoice ->> 'tax_total')::numeric;
  v_total     numeric(12,2) := (p_invoice ->> 'total')::numeric;
  v_sum_disc  numeric(12,2);
  v_sum_tax   numeric(12,2);
  v_sum_total numeric(12,2);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An invoice needs at least one line item' using errcode = '23514';
  end if;

  select coalesce(sum(i.discount_amount), 0), coalesce(sum(i.tax_amount), 0), coalesce(sum(i.line_total), 0)
    into v_sum_disc, v_sum_tax, v_sum_total
    from jsonb_to_recordset(p_items)
         as i(discount_amount numeric, tax_amount numeric, line_total numeric);

  if v_sum_disc <> v_discount
     or v_sum_tax <> v_tax
     or v_sum_total <> v_total
     or v_subtotal - v_discount + v_tax <> v_total then
    raise exception 'Invoice totals do not match the line items' using errcode = '23514';
  end if;

  insert into public.invoices (
    customer_id, subscription_id, currency, issue_date, due_date, period_start, period_end,
    subtotal, discount_total, tax_total, total, notes, created_by
  ) values (
    (p_invoice ->> 'customer_id')::uuid,
    nullif(p_invoice ->> 'subscription_id', '')::uuid,
    coalesce(p_invoice ->> 'currency', 'INR'),
    (p_invoice ->> 'issue_date')::date,
    (p_invoice ->> 'due_date')::date,
    nullif(p_invoice ->> 'period_start', '')::date,
    nullif(p_invoice ->> 'period_end', '')::date,
    v_subtotal, v_discount, v_tax, v_total,
    nullif(p_invoice ->> 'notes', ''),
    auth.uid()
  )
  returning id into v_id;

  insert into public.invoice_items (
    invoice_id, plan_id, product_id, description, quantity, unit_price,
    discount_percent, tax_rate, discount_amount, tax_amount, line_total, sort_order
  )
  select
    v_id, i.plan_id, i.product_id, i.description, i.quantity, i.unit_price,
    coalesce(i.discount_percent, 0), coalesce(i.tax_rate, 0),
    i.discount_amount, i.tax_amount, i.line_total, (e.ord - 1)::int
  from jsonb_array_elements(p_items) with ordinality as e(item, ord),
       lateral jsonb_to_record(e.item) as i(
         plan_id uuid, product_id uuid, description text, quantity numeric, unit_price numeric,
         discount_percent numeric, tax_rate numeric, discount_amount numeric, tax_amount numeric,
         line_total numeric
       );

  return v_id;
end $$;

revoke execute on function public.create_invoice_with_items(jsonb, jsonb) from public, anon;
grant execute on function public.create_invoice_with_items(jsonb, jsonb) to authenticated;

-- Defensive grants for signed-in users. Supabase normally grants these by default, but invoice
-- numbers come from sequences, so we state it explicitly rather than depend on project defaults.
-- Row Level Security (migration 5) still decides which rows each role can read or write.
-- Nothing is granted to anon.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
