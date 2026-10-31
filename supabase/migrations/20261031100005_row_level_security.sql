-- 5/6  Row Level Security.
-- Model: admin + staff = full access (admin-only deletes); customer = read-only access to
-- their OWN records (linked via customers.user_id); anon = nothing.
-- The service-role key is never needed or used by this application.

alter table public.profiles            enable row level security;
alter table public.customers           enable row level security;
alter table public.products            enable row level security;
alter table public.plans               enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.subscription_items  enable row level security;
alter table public.quotations          enable row level security;
alter table public.quotation_items     enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_items       enable row level security;
alter table public.payments            enable row level security;

-- profiles: no INSERT/DELETE policies (rows are created by trigger, removed by cascade).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
-- A user may edit their own row but cannot change their own role.
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- customers
create policy customers_select on public.customers for select to authenticated
  using (public.is_staff() or user_id = auth.uid());
create policy customers_insert on public.customers for insert to authenticated with check (public.is_staff());
create policy customers_update on public.customers for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy customers_delete on public.customers for delete to authenticated using (public.is_admin());

-- products & plans: customers see active ones only
create policy products_select on public.products for select to authenticated
  using (public.is_staff() or is_active);
create policy products_insert on public.products for insert to authenticated with check (public.is_staff());
create policy products_update on public.products for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy products_delete on public.products for delete to authenticated using (public.is_admin());

create policy plans_select on public.plans for select to authenticated
  using (public.is_staff() or is_active);
create policy plans_insert on public.plans for insert to authenticated with check (public.is_staff());
create policy plans_update on public.plans for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy plans_delete on public.plans for delete to authenticated using (public.is_admin());

-- subscriptions
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_staff() or customer_id = public.current_customer_id());
create policy subscriptions_insert on public.subscriptions for insert to authenticated with check (public.is_staff());
create policy subscriptions_update on public.subscriptions for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy subscriptions_delete on public.subscriptions for delete to authenticated using (public.is_admin());

create policy subscription_items_select on public.subscription_items for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id));
create policy subscription_items_insert on public.subscription_items for insert to authenticated with check (public.is_staff());
create policy subscription_items_update on public.subscription_items for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy subscription_items_delete on public.subscription_items for delete to authenticated using (public.is_staff());

-- quotations: customers never see drafts
create policy quotations_select on public.quotations for select to authenticated
  using (public.is_staff() or (customer_id = public.current_customer_id() and status <> 'draft'));
create policy quotations_insert on public.quotations for insert to authenticated with check (public.is_staff());
create policy quotations_update on public.quotations for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy quotations_delete on public.quotations for delete to authenticated using (public.is_admin());

create policy quotation_items_select on public.quotation_items for select to authenticated
  using (exists (select 1 from public.quotations q where q.id = quotation_id));
create policy quotation_items_insert on public.quotation_items for insert to authenticated with check (public.is_staff());
create policy quotation_items_update on public.quotation_items for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy quotation_items_delete on public.quotation_items for delete to authenticated using (public.is_staff());

-- invoices: customers never see drafts
create policy invoices_select on public.invoices for select to authenticated
  using (public.is_staff() or (customer_id = public.current_customer_id() and status <> 'draft'));
create policy invoices_insert on public.invoices for insert to authenticated with check (public.is_staff());
create policy invoices_update on public.invoices for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy invoices_delete on public.invoices for delete to authenticated using (public.is_admin());

create policy invoice_items_select on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));
create policy invoice_items_insert on public.invoice_items for insert to authenticated with check (public.is_staff());
create policy invoice_items_update on public.invoice_items for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy invoice_items_delete on public.invoice_items for delete to authenticated using (public.is_staff());

-- payments: customers can read their own; only staff record or change payments
create policy payments_select on public.payments for select to authenticated
  using (public.is_staff() or customer_id = public.current_customer_id());
create policy payments_insert on public.payments for insert to authenticated with check (public.is_staff());
create policy payments_update on public.payments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy payments_delete on public.payments for delete to authenticated using (public.is_admin());
