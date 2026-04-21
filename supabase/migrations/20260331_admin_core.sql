create table if not exists public.admin_profiles (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists admin_profiles_owner_idx on public.admin_profiles (owner_uid);

create table if not exists public.admin_content_posts (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists admin_content_posts_owner_idx on public.admin_content_posts (owner_uid);
create index if not exists admin_content_posts_admin_idx on public.admin_content_posts (admin_id);

create table if not exists public.admin_content_platforms (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.admin_marketing_events (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists admin_marketing_events_owner_idx on public.admin_marketing_events (owner_uid);

create table if not exists public.admin_notes (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists admin_notes_owner_idx on public.admin_notes (owner_uid);

create table if not exists public.admin_qr_personal (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists admin_qr_personal_admin_idx on public.admin_qr_personal (admin_id);

create table if not exists public.admin_qr_generic (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists admin_qr_generic_admin_idx on public.admin_qr_generic (admin_id);

create table if not exists public.admin_qr_leads (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists admin_qr_leads_admin_idx on public.admin_qr_leads (admin_id);

create table if not exists public.admin_settings (
  id text primary key,
  owner_uid text null,
  admin_id text null,
  name text not null,
  path_key text null,
  table_prefix text null,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);
