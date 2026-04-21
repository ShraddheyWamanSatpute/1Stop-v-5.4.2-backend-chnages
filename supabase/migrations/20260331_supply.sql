create table if not exists public.supply_clients (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  supply_path text not null,
  name text not null,
  status text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists supply_clients_supply_path_idx on public.supply_clients (supply_path);
create index if not exists supply_clients_company_idx on public.supply_clients (company_id);

create table if not exists public.supply_orders (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  supply_path text not null,
  name text not null,
  status text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists supply_orders_supply_path_idx on public.supply_orders (supply_path);
create index if not exists supply_orders_company_idx on public.supply_orders (company_id);

create table if not exists public.supply_deliveries (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  supply_path text not null,
  name text not null,
  status text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists supply_deliveries_supply_path_idx on public.supply_deliveries (supply_path);
create index if not exists supply_deliveries_company_idx on public.supply_deliveries (company_id);

create table if not exists public.supply_client_invites (
  id text primary key,
  code text not null unique,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  supply_path text not null,
  status text null,
  expires_at bigint null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists supply_client_invites_supply_path_idx on public.supply_client_invites (supply_path);
create index if not exists supply_client_invites_company_idx on public.supply_client_invites (company_id);

create table if not exists public.supply_supplier_connections (
  id text primary key,
  customer_company_id text not null,
  supplier_company_id text not null,
  payload jsonb not null default '{}'::jsonb,
  linked_at bigint not null,
  updated_at bigint not null
);

create unique index if not exists supply_supplier_connections_pair_idx
  on public.supply_supplier_connections (customer_company_id, supplier_company_id);

create table if not exists public.supply_settings (
  id text primary key,
  company_id text not null,
  site_id text null,
  subsite_id text null,
  section text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null
);

create unique index if not exists supply_settings_scope_section_idx
  on public.supply_settings (company_id, site_id, subsite_id, section);
create index if not exists supply_settings_company_idx on public.supply_settings (company_id);
