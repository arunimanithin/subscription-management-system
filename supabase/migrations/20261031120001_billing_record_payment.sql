-- Billing Part 2: safe payment recording.
--
-- record_payment() runs as the caller (SECURITY INVOKER, so RLS applies: only admin/staff can
-- pay) and, in one transaction:
--   1. locks the invoice row (FOR UPDATE) so two simultaneous payments cannot both pass the
--      balance check,
--   2. replays an earlier identical request instead of creating a second payment
--      (idempotency key), and rejects a reused key with different details,
--   3. only accepts payments on open / partially_paid / overdue invoices,
--   4. rejects amounts above the balance due with a readable message.
-- The existing triggers (migration 4) then keep invoices.amount_paid / status in sync.
--
-- Custom error codes (mapped to API errors in src/features/billing/payments/errors.ts):
--   P0002 invoice not found / not visible   PB001 invoice not payable (status)
--   PB002 amount exceeds balance due        PB003 idempotency key reused for a different payment

alter table public.payments add column idempotency_key text;
alter table public.payments add constraint payments_idempotency_key_len
  check (idempotency_key is null or char_length(idempotency_key) between 8 and 100);
-- Backstop for the function's own check: the same key can never create two payments per invoice.
create unique index payments_invoice_idempotency_key on public.payments (invoice_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.record_payment(
  p_invoice_id       uuid,
  p_amount           numeric,
  p_method           text,
  p_reference        text        default null,
  p_paid_at          timestamptz default null,
  p_notes            text        default null,
  p_idempotency_key  text        default null,
  p_status           text        default 'succeeded'
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_inv      public.invoices%rowtype;
  v_existing public.payments%rowtype;
  v_id       uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = '23514';
  end if;
  if p_amount <> round(p_amount, 2) then
    raise exception 'Payment amount can have at most 2 decimal places' using errcode = '23514';
  end if;
  if p_status = 'refunded' then
    raise exception 'A payment cannot be created as refunded; refund an existing payment instead' using errcode = '23514';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0002';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing from public.payments
     where invoice_id = p_invoice_id and idempotency_key = p_idempotency_key;
    if found then
      if v_existing.amount <> p_amount or v_existing.method <> p_method then
        raise exception 'This idempotency key was already used for a different payment' using errcode = 'PB003';
      end if;
      return jsonb_build_object('payment_id', v_existing.id, 'replayed', true);
    end if;
  end if;

  if v_inv.status not in ('open', 'partially_paid', 'overdue') then
    raise exception 'Payments can only be recorded against open, partially paid or overdue invoices (this invoice is %)', v_inv.status
      using errcode = 'PB001';
  end if;

  if p_status = 'succeeded' and p_amount > v_inv.amount_due then
    raise exception 'Payment of % exceeds the balance due of %', p_amount, v_inv.amount_due using errcode = 'PB002';
  end if;

  insert into public.payments (invoice_id, amount, method, status, reference, paid_at, notes, recorded_by, idempotency_key)
  values (p_invoice_id, p_amount, p_method, p_status, nullif(p_reference, ''), coalesce(p_paid_at, now()),
          nullif(p_notes, ''), auth.uid(), p_idempotency_key)
  returning id into v_id;

  return jsonb_build_object('payment_id', v_id, 'replayed', false);
end $$;

revoke execute on function public.record_payment(uuid, numeric, text, text, timestamptz, text, text, text) from public, anon;
grant execute on function public.record_payment(uuid, numeric, text, text, timestamptz, text, text, text) to authenticated;
