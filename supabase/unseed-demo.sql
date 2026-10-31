-- =====================================================================================
-- Removes the shared DEMO data created by seed-demo.sql. Run it only on purpose.
--
--  * Deletes ONLY rows that belong to the 12 demo customers (fixed ids de000001-...) or that
--    have a demo id. Real customers, invoices, payments and users are never touched. That
--    includes records teammates created by billing the demo subscriptions or paying demo invoices.
--  * Does not delete the demo login users (Authentication -> Users); remove those by hand.
--  * Demo products and plans are removed too (they have demo ids).
-- =====================================================================================
begin;

delete from public.payments
 where customer_id in (select id from public.customers where id::text like 'de000001-%')
    or id::text like 'de00000a-%';

delete from public.invoices            -- invoice_items are removed with their invoice (cascade)
 where customer_id in (select id from public.customers where id::text like 'de000001-%')
    or id::text like 'de000008-%';

delete from public.quotations          -- quotation_items cascade
 where customer_id in (select id from public.customers where id::text like 'de000001-%')
    or id::text like 'de000006-%';

delete from public.subscriptions       -- subscription_items cascade
 where customer_id in (select id from public.customers where id::text like 'de000001-%')
    or id::text like 'de000004-%';

delete from public.customers where id::text like 'de000001-%';
delete from public.plans     where id::text like 'de000003-%';
delete from public.products  where id::text like 'de000002-%';

commit;
