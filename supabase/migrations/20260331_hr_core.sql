create table if not exists public.hr_employees (
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

create index if not exists hr_employees_base_path_idx on public.hr_employees (base_path);
create index if not exists hr_employees_company_idx on public.hr_employees (company_id);

create table if not exists public.hr_time_offs (
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

create index if not exists hr_time_offs_base_path_idx on public.hr_time_offs (base_path);
create index if not exists hr_time_offs_company_idx on public.hr_time_offs (company_id);

create table if not exists public.hr_attendances (
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

create index if not exists hr_attendances_base_path_idx on public.hr_attendances (base_path);
create index if not exists hr_attendances_company_idx on public.hr_attendances (company_id);

create table if not exists public.hr_schedules (
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

create index if not exists hr_schedules_base_path_idx on public.hr_schedules (base_path);
create index if not exists hr_schedules_company_idx on public.hr_schedules (company_id);
