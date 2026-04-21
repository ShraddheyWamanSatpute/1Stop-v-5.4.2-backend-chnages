create table if not exists public.app_messenger_entities (
  row_id text primary key,
  entity_type text not null,
  entity_id text not null,
  company_id text,
  site_id text,
  subsite_id text,
  base_path text,
  user_id text,
  secondary_id text,
  name text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create unique index if not exists idx_app_messenger_entities_unique
  on public.app_messenger_entities (entity_type, coalesce(base_path, ''), coalesce(user_id, ''), coalesce(secondary_id, ''), entity_id);

create index if not exists idx_app_messenger_entities_base
  on public.app_messenger_entities (entity_type, base_path, created_at asc);

create index if not exists idx_app_messenger_entities_user
  on public.app_messenger_entities (entity_type, user_id, updated_at desc);

create index if not exists idx_app_messenger_entities_company
  on public.app_messenger_entities (entity_type, company_id, updated_at desc);

create index if not exists idx_app_messenger_entities_secondary
  on public.app_messenger_entities (entity_type, secondary_id, created_at asc);
