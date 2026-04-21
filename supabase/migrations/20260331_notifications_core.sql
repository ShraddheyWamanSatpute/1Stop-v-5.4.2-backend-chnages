create table if not exists public.app_notifications (
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

create index if not exists app_notifications_base_path_idx on public.app_notifications (base_path);
create index if not exists app_notifications_company_idx on public.app_notifications (company_id);
create index if not exists app_notifications_status_idx on public.app_notifications (status);

create table if not exists public.app_notification_settings (
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

create index if not exists app_notification_settings_base_path_idx on public.app_notification_settings (base_path);
create index if not exists app_notification_settings_company_idx on public.app_notification_settings (company_id);
