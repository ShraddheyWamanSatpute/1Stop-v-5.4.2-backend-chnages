create table if not exists public.stock_suppliers (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  base_path text not null,
  name text not null,
  status text null,
  code text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists stock_suppliers_base_path_idx on public.stock_suppliers (base_path);
create index if not exists stock_suppliers_company_idx on public.stock_suppliers (company_id);

create table if not exists public.stock_items (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  base_path text not null,
  name text not null,
  status text null,
  code text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists stock_items_base_path_idx on public.stock_items (base_path);
create index if not exists stock_items_company_idx on public.stock_items (company_id);
create index if not exists stock_items_code_idx on public.stock_items (code);

create table if not exists public.stock_purchase_orders (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  base_path text not null,
  name text not null,
  status text null,
  code text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists stock_purchase_orders_base_path_idx on public.stock_purchase_orders (base_path);
create index if not exists stock_purchase_orders_company_idx on public.stock_purchase_orders (company_id);

create table if not exists public.stock_counts (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  base_path text not null,
  name text not null,
  status text null,
  code text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists stock_counts_base_path_idx on public.stock_counts (base_path);
create index if not exists stock_counts_company_idx on public.stock_counts (company_id);
