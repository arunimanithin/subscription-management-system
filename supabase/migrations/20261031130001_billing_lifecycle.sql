-- Billing Part 3: invoice lifecycle (void, overdue tracking, draft editing).
-- All functions are SECURITY INVOKER: the caller's RLS applies (only admin/staff can update
-- invoices), so no service-role key is needed.

-- 1. A partially paid invoice that is past its due date is OVERDUE (it still has a balance).
--    The original function only produced 'overdue' for invoices with nothing paid, so a second
--    partial payment on an overdue invoice silently turned it back into 'partially_paid'.
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
  elsif v_due < current_date then v_new := 'overdue';
  elsif v_paid > 0 then v_new := 'partially_paid';
  else v_new := 'open';
  end if;

  update public.invoices
     set amount_paid = v_paid,
         status = v_new,
         paid_at = case when v_new = 'paid' then coalesce(paid_at, now()) else null end
   where id = p_invoice;
end $$;
revoke execute on function public.recompute_invoice_payment_state(uuid) from public, anon, authenticated;

-- 2. Overdue sweep: open / partially paid invoices whose due date has passed become 'overdue'.
--    Idempotent; returns how many invoices changed. Safe to call from the app or from pg_cron.
create or replace function public.mark_overdue_invoices()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare v_count integer;
begin
  update public.invoices
     set status = 'overdue'
   where status in ('open', 'partially_paid')
     and due_date < current_date
     and amount_due > 0;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.mark_overdue_invoices() from public, anon;
grant execute on function public.mark_overdue_invoices() to authenticated;

-- 3. Void an invoice. Allowed for draft / open / overdue invoices that have no money on them.
--    An invoice with payments must have them refunded first (then it is open/overdue again).
create or replace function public.void_invoice(p_invoice_id uuid, p_reason text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_status text; v_paid numeric(12,2);
begin
  select status, amount_paid into v_status, v_paid
  from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0002';
  end if;
  if v_status not in ('draft', 'open', 'overdue') then
    raise exception 'A % invoice cannot be voided', replace(v_status, '_', ' ') using errcode = 'PB001';
  end if;
  if v_paid > 0 then
    raise exception 'Refund the payments on this invoice before voiding it' using errcode = 'PB001';
  end if;
  if exists (select 1 from public.payments where invoice_id = p_invoice_id and status = 'pending') then
    raise exception 'This invoice has pending payments; resolve them before voiding' using errcode = 'PB001';
  end if;

  update public.invoices
     set status = 'void',
         voided_at = now(),
         notes = case when nullif(trim(p_reason), '') is null then notes
                      else concat_ws(E'\n', notes, 'Voided: ' || trim(p_reason)) end
   where id = p_invoice_id;
  return p_invoice_id;
end $$;
revoke execute on function public.void_invoice(uuid, text) from public, anon;
grant execute on function public.void_invoice(uuid, text) to authenticated;

-- 4. Edit a DRAFT invoice. Header fields are patched only when the key is present in p_invoice;
--    when p_items is given, the lines are replaced and the header totals (computed by the app with
--    src/lib/money.ts) must match them, exactly like create_invoice_with_items.
create or replace function public.update_draft_invoice(p_invoice_id uuid, p_invoice jsonb, p_items jsonb default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status    text;
  v_subtotal  numeric(12,2);
  v_discount  numeric(12,2);
  v_tax       numeric(12,2);
  v_total     numeric(12,2);
  v_sum_disc  numeric(12,2);
  v_sum_tax   numeric(12,2);
  v_sum_total numeric(12,2);
begin
  select status into v_status from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0002';
  end if;
  if v_status <> 'draft' then
    raise exception 'Only draft invoices can be edited (this invoice is %)', replace(v_status, '_', ' ') using errcode = 'PB001';
  end if;

  if p_items is not null then
    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
      raise exception 'An invoice needs at least one line item' using errcode = '23514';
    end if;
    v_subtotal := (p_invoice ->> 'subtotal')::numeric;
    v_discount := (p_invoice ->> 'discount_total')::numeric;
    v_tax      := (p_invoice ->> 'tax_total')::numeric;
    v_total    := (p_invoice ->> 'total')::numeric;
    select coalesce(sum(i.discount_amount), 0), coalesce(sum(i.tax_amount), 0), coalesce(sum(i.line_total), 0)
      into v_sum_disc, v_sum_tax, v_sum_total
      from jsonb_to_recordset(p_items) as i(discount_amount numeric, tax_amount numeric, line_total numeric);
    if v_sum_disc <> v_discount or v_sum_tax <> v_tax or v_sum_total <> v_total
       or v_subtotal - v_discount + v_tax <> v_total then
      raise exception 'Invoice totals do not match the line items' using errcode = '23514';
    end if;
  end if;

  update public.invoices set
    customer_id     = case when p_invoice ? 'customer_id' then (p_invoice ->> 'customer_id')::uuid else customer_id end,
    subscription_id = case when p_invoice ? 'subscription_id' then nullif(p_invoice ->> 'subscription_id', '')::uuid else subscription_id end,
    currency        = case when p_invoice ? 'currency' then p_invoice ->> 'currency' else currency end,
    issue_date      = case when p_invoice ? 'issue_date' then (p_invoice ->> 'issue_date')::date else issue_date end,
    due_date        = case when p_invoice ? 'due_date' then (p_invoice ->> 'due_date')::date else due_date end,
    period_start    = case when p_invoice ? 'period_start' then nullif(p_invoice ->> 'period_start', '')::date else period_start end,
    period_end      = case when p_invoice ? 'period_end' then nullif(p_invoice ->> 'period_end', '')::date else period_end end,
    notes           = case when p_invoice ? 'notes' then nullif(p_invoice ->> 'notes', '') else notes end,
    subtotal        = coalesce(v_subtotal, subtotal),
    discount_total  = coalesce(v_discount, discount_total),
    tax_total       = coalesce(v_tax, tax_total),
    total           = coalesce(v_total, total)
  where id = p_invoice_id;

  if p_items is not null then
    delete from public.invoice_items where invoice_id = p_invoice_id;
    insert into public.invoice_items (
      invoice_id, plan_id, product_id, description, quantity, unit_price,
      discount_percent, tax_rate, discount_amount, tax_amount, line_total, sort_order
    )
    select
      p_invoice_id, i.plan_id, i.product_id, i.description, i.quantity, i.unit_price,
      coalesce(i.discount_percent, 0), coalesce(i.tax_rate, 0),
      i.discount_amount, i.tax_amount, i.line_total, (e.ord - 1)::int
    from jsonb_array_elements(p_items) with ordinality as e(item, ord),
         lateral jsonb_to_record(e.item) as i(
           plan_id uuid, product_id uuid, description text, quantity numeric, unit_price numeric,
           discount_percent numeric, tax_rate numeric, discount_amount numeric, tax_amount numeric,
           line_total numeric
         );
  end if;
  return p_invoice_id;
end $$;
revoke execute on function public.update_draft_invoice(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.update_draft_invoice(uuid, jsonb, jsonb) to authenticated;
