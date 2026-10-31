-- Optional demo catalogue (no users, no customers, no secrets).
-- Applied automatically by `supabase db reset`; otherwise paste into the SQL editor once.

insert into public.products (id, name, sku, description, category) values
  ('00000000-0000-0000-0000-0000000000a1', 'Cloud Storage', 'CLOUD-STORAGE', 'Managed object storage', 'Infrastructure'),
  ('00000000-0000-0000-0000-0000000000a2', 'Analytics Suite', 'ANALYTICS', 'Dashboards and reporting', 'Software'),
  ('00000000-0000-0000-0000-0000000000a3', 'Premium Support', 'SUPPORT', '24x7 support add-on', 'Services')
on conflict do nothing;

insert into public.plans (product_id, name, price, billing_interval, interval_count, trial_days, tax_rate) values
  ('00000000-0000-0000-0000-0000000000a1', 'Storage Starter (monthly)', 499,   'month', 1, 14, 18),
  ('00000000-0000-0000-0000-0000000000a1', 'Storage Pro (monthly)',     1499,  'month', 1, 14, 18),
  ('00000000-0000-0000-0000-0000000000a2', 'Analytics Team (monthly)',   2999,  'month', 1, 7,  18),
  ('00000000-0000-0000-0000-0000000000a2', 'Analytics Team (yearly)',    29990, 'year',  1, 7,  18),
  ('00000000-0000-0000-0000-0000000000a3', 'Support Plus (quarterly)',   3999,  'quarter', 1, 0, 18);
