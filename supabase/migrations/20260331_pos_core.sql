create table if not exists public.app_pos_entities (
  row_id text primary key,
  entity_type text not null,
  entity_id text not null,
  company_id text not null,
  site_id text,
  subsite_id text,
  base_path text not null,
  name text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create unique index if not exists idx_app_pos_entities_entity_unique
  on public.app_pos_entities (entity_type, base_path, entity_id);

create index if not exists idx_app_pos_entities_lookup
  on public.app_pos_entities (entity_type, base_path, created_at asc);

create index if not exists idx_app_pos_entities_updated
  on public.app_pos_entities (entity_type, base_path, updated_at desc);

create index if not exists idx_app_pos_entities_company
  on public.app_pos_entities (company_id, entity_type, updated_at desc);

create index if not exists idx_app_pos_payment_transactions_bill
  on public.app_pos_entities ((payload->>'billId'))
  where entity_type = 'paymentTransactions';

create index if not exists idx_app_pos_sales_product
  on public.app_pos_entities ((payload->>'productId'))
  where entity_type = 'sales';
