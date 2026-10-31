-- Billing Part 4: recurring billing.
-- generate_subscription_invoice creates ONE invoice for ONE subscription period and advances the
-- subscription's billing dates, all in a single transaction. SECURITY INVOKER: the caller's RLS
-- applies (admin/staff only), no service-role key.
--
-- The app decides the period and computes every amount (src/lib/money.ts, src/lib/billing-period.ts)
-- and passes them in. This function:
--   * locks the subscription row, so two concurrent runs cannot bill the same period twice;
--   * is idempotent per period: if a non-void invoice for (subscription, period_start) exists it
--     returns that invoice with replayed = true instead of creating another;
--   * refuses subscriptions that are not billable (only active / past_due) – PB001;
--   * refuses when the subscription's billing date no longer matches what the app computed
--     (someone changed it in the meantime) – PB003;
--   * issues the invoice (status open) because recurring invoices are sent automatically;
--   * moves current_period_start/end and next_billing_date to the billed period.
--
-- Convention (documented in CONTRACTS.md): a period is billed IN ADVANCE, starting on
-- next_billing_date (falling back to current_period_start, then start_date). Period dates are
-- inclusive: period_end = start + interval - 1 day; next_billing_date = start + interval.

create or replace function public.generate_subscription_invoice(
  p_subscription_id uuid,
  p_period_start    date,
  p_period_end      date,
  p_next_billing    date,
  p_invoice         jsonb,
  p_items           jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sub      public.subscriptions%rowtype;
  v_existing uuid;
  v_id       uuid;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  -- Idempotency first: a retry after success must not look like an error.
  select id into v_existing from public.invoices
   where subscription_id = p_subscription_id and period_start = p_period_start and status <> 'void'
   limit 1;
  if v_existing is not null then
    return jsonb_build_object('invoice_id', v_existing, 'replayed', true);
  end if;

  if v_sub.status not in ('active', 'past_due') then
    raise exception 'A % subscription cannot be billed', replace(v_sub.status, '_', ' ') using errcode = 'PB001';
  end if;

  if coalesce(v_sub.next_billing_date, v_sub.current_period_start, v_sub.start_date) <> p_period_start then
    raise exception 'The subscription billing date changed; reload and try again' using errcode = 'PB003';
  end if;

  if (p_invoice ->> 'total')::numeric <= 0 then
    raise exception 'An invoice with a zero total cannot be issued' using errcode = '23514';
  end if;

  -- same checks as manual invoices: header totals must match the lines
  v_id := public.create_invoice_with_items(
    p_invoice || jsonb_build_object(
      'subscription_id', p_subscription_id,
      'period_start', p_period_start,
      'period_end', p_period_end
    ),
    p_items
  );
  update public.invoices set status = 'open' where id = v_id;

  update public.subscriptions
     set current_period_start = p_period_start,
         current_period_end   = p_period_end,
         next_billing_date    = p_next_billing
   where id = p_subscription_id;

  return jsonb_build_object('invoice_id', v_id, 'replayed', false);
end $$;

revoke execute on function public.generate_subscription_invoice(uuid, date, date, date, jsonb, jsonb) from public, anon;
grant execute on function public.generate_subscription_invoice(uuid, date, date, date, jsonb, jsonb) to authenticated;
