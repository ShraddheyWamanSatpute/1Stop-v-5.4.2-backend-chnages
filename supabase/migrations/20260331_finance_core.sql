create table if not exists public.finance_accounts (
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

create index if not exists finance_accounts_base_path_idx on public.finance_accounts (base_path);
create index if not exists finance_accounts_company_idx on public.finance_accounts (company_id);
create index if not exists finance_accounts_code_idx on public.finance_accounts (code);

create table if not exists public.finance_transactions (
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

create index if not exists finance_transactions_base_path_idx on public.finance_transactions (base_path);
create index if not exists finance_transactions_company_idx on public.finance_transactions (company_id);
create index if not exists finance_transactions_code_idx on public.finance_transactions (code);

create table if not exists public.finance_bills (
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

create index if not exists finance_bills_base_path_idx on public.finance_bills (base_path);
create index if not exists finance_bills_company_idx on public.finance_bills (company_id);
create index if not exists finance_bills_code_idx on public.finance_bills (code);

create table if not exists public.finance_contacts (
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

create index if not exists finance_contacts_base_path_idx on public.finance_contacts (base_path);
create index if not exists finance_contacts_company_idx on public.finance_contacts (company_id);

create table if not exists public.finance_budgets (
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

create index if not exists finance_budgets_base_path_idx on public.finance_budgets (base_path);
create index if not exists finance_budgets_company_idx on public.finance_budgets (company_id);
