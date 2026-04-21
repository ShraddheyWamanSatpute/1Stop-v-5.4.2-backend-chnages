create table if not exists public.app_user_profiles (
  id text primary key,
  email text,
  display_name text,
  current_company_id text,
  account_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_app_user_profiles_email
  on public.app_user_profiles (email);

create index if not exists idx_app_user_profiles_current_company
  on public.app_user_profiles (current_company_id);

create index if not exists idx_app_user_profiles_updated_at
  on public.app_user_profiles (updated_at desc);

create table if not exists public.app_company_business_settings (
  company_id text primary key,
  business_name text,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_app_company_business_settings_updated_at
  on public.app_company_business_settings (updated_at desc);
