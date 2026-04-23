create table if not exists public.app_bookings (
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

create index if not exists app_bookings_base_path_idx on public.app_bookings (base_path);
create index if not exists app_bookings_company_idx on public.app_bookings (company_id);
create index if not exists app_bookings_status_idx on public.app_bookings (status);
create index if not exists app_bookings_code_idx on public.app_bookings (code);

create table if not exists public.app_booking_tables (
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

create index if not exists app_booking_tables_base_path_idx on public.app_booking_tables (base_path);
create index if not exists app_booking_tables_company_idx on public.app_booking_tables (company_id);

create table if not exists public.app_booking_table_types (
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

create index if not exists app_booking_table_types_base_path_idx on public.app_booking_table_types (base_path);
create index if not exists app_booking_table_types_company_idx on public.app_booking_table_types (company_id);

create table if not exists public.app_booking_types (
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

create index if not exists app_booking_types_base_path_idx on public.app_booking_types (base_path);
create index if not exists app_booking_types_company_idx on public.app_booking_types (company_id);

create table if not exists public.app_booking_statuses (
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

create index if not exists app_booking_statuses_base_path_idx on public.app_booking_statuses (base_path);
create index if not exists app_booking_statuses_company_idx on public.app_booking_statuses (company_id);

create table if not exists public.app_booking_waitlist (
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

create index if not exists app_booking_waitlist_base_path_idx on public.app_booking_waitlist (base_path);
create index if not exists app_booking_waitlist_company_idx on public.app_booking_waitlist (company_id);

create table if not exists public.app_booking_customers (
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

create index if not exists app_booking_customers_base_path_idx on public.app_booking_customers (base_path);
create index if not exists app_booking_customers_company_idx on public.app_booking_customers (company_id);

create table if not exists public.app_booking_settings (
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

create index if not exists app_booking_settings_base_path_idx on public.app_booking_settings (base_path);
create index if not exists app_booking_settings_company_idx on public.app_booking_settings (company_id);

create table if not exists public.app_booking_floor_plans (
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

create index if not exists app_booking_floor_plans_base_path_idx on public.app_booking_floor_plans (base_path);
create index if not exists app_booking_floor_plans_company_idx on public.app_booking_floor_plans (company_id);

create table if not exists public.app_booking_tags (
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

create index if not exists app_booking_tags_base_path_idx on public.app_booking_tags (base_path);
create index if not exists app_booking_tags_company_idx on public.app_booking_tags (company_id);

create table if not exists public.app_booking_preorder_profiles (
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

create index if not exists app_booking_preorder_profiles_base_path_idx on public.app_booking_preorder_profiles (base_path);
create index if not exists app_booking_preorder_profiles_company_idx on public.app_booking_preorder_profiles (company_id);

create table if not exists public.app_booking_locations (
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

create index if not exists app_booking_locations_base_path_idx on public.app_booking_locations (base_path);
create index if not exists app_booking_locations_company_idx on public.app_booking_locations (company_id);
