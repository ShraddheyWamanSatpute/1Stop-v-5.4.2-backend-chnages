create table if not exists public.app_locations (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  base_path text not null,
  name text not null,
  status text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists app_locations_base_path_idx on public.app_locations (base_path);
create index if not exists app_locations_company_idx on public.app_locations (company_id);

create table if not exists public.app_products (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  base_path text not null,
  name text not null,
  code text null,
  status text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists app_products_base_path_idx on public.app_products (base_path);
create index if not exists app_products_company_idx on public.app_products (company_id);
create index if not exists app_products_code_idx on public.app_products (code);

create table if not exists public.app_product_categories (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  base_path text not null,
  name text not null,
  code text null,
  status text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists app_product_categories_base_path_idx on public.app_product_categories (base_path);
create index if not exists app_product_categories_company_idx on public.app_product_categories (company_id);
create index if not exists app_product_categories_code_idx on public.app_product_categories (code);
