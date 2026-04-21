create table if not exists public.companies (
  id text primary key,
  name text not null default '',
  status text,
  company_type text,
  payload jsonb not null default '{}'::jsonb,
  created_by text,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists companies_name_idx on public.companies (name);
create index if not exists companies_type_idx on public.companies (company_type);

create table if not exists public.company_permissions (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null
);

create unique index if not exists company_permissions_company_id_idx on public.company_permissions (company_id);

create table if not exists public.company_configs (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  scope_type text not null check (scope_type in ('company', 'site', 'subsite')),
  site_id text,
  subsite_id text,
  payload jsonb not null default '[]'::jsonb,
  updated_at bigint not null
);

create index if not exists company_configs_company_scope_idx
  on public.company_configs (company_id, scope_type, site_id, subsite_id);

create table if not exists public.company_setups (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create unique index if not exists company_setups_company_id_idx on public.company_setups (company_id);

create table if not exists public.company_sites (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  name text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists company_sites_company_id_idx on public.company_sites (company_id);

create table if not exists public.company_subsites (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  site_id text not null references public.company_sites(id) on delete cascade,
  name text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists company_subsites_company_site_idx on public.company_subsites (company_id, site_id);

create table if not exists public.company_users (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  user_id text not null,
  role text,
  department text,
  site_id text,
  subsite_id text,
  payload jsonb not null default '{}'::jsonb,
  joined_at bigint,
  updated_at bigint not null
);

create unique index if not exists company_users_company_user_idx on public.company_users (company_id, user_id);

create table if not exists public.user_company_links (
  id text primary key,
  user_id text not null,
  company_id text not null references public.companies(id) on delete cascade,
  company_name text,
  role text,
  department text,
  site_id text,
  subsite_id text,
  payload jsonb not null default '{}'::jsonb,
  joined_at bigint,
  updated_at bigint not null
);

create unique index if not exists user_company_links_user_company_idx on public.user_company_links (user_id, company_id);
