create table if not exists public.finance_journals (
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

create index if not exists finance_journals_base_path_idx on public.finance_journals (base_path);
create index if not exists finance_journals_company_idx on public.finance_journals (company_id);
create index if not exists finance_journals_code_idx on public.finance_journals (code);

create table if not exists public.finance_dimensions (
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

create index if not exists finance_dimensions_base_path_idx on public.finance_dimensions (base_path);
create index if not exists finance_dimensions_company_idx on public.finance_dimensions (company_id);
create index if not exists finance_dimensions_code_idx on public.finance_dimensions (code);

create table if not exists public.finance_period_locks (
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

create index if not exists finance_period_locks_base_path_idx on public.finance_period_locks (base_path);
create index if not exists finance_period_locks_company_idx on public.finance_period_locks (company_id);

create table if not exists public.finance_opening_balances (
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

create index if not exists finance_opening_balances_base_path_idx on public.finance_opening_balances (base_path);
create index if not exists finance_opening_balances_company_idx on public.finance_opening_balances (company_id);
