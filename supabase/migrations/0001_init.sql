-- VapeShop initial schema
-- Run: supabase db push

set check_function_bodies = off;

create extension if not exists pgcrypto;

-- =====================================================================
-- Tables
-- =====================================================================

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  pin_hash     text not null,
  role         text not null check (role in ('owner','worker')),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table if not exists products (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  category_id           uuid references categories(id) on delete set null,
  cost_price            numeric(10,3) not null default 0,
  sell_price            numeric(10,3) not null default 0,
  stock                 integer not null default 0,
  low_stock_threshold   integer not null default 5,
  photo_url             text,
  barcode               text unique,
  archived              boolean not null default false,
  created_at            timestamptz not null default now()
);

create index if not exists products_category_idx on products(category_id);
create index if not exists products_archived_idx on products(archived);

create table if not exists shifts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id),
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz,
  opening_cash   numeric(10,3) not null default 0,
  closing_cash   numeric(10,3),
  expected_cash  numeric(10,3),
  note           text
);

-- one open shift per user
create unique index if not exists shifts_one_open_per_user
  on shifts(user_id) where closed_at is null;

create table if not exists sales (
  id              uuid primary key default gen_random_uuid(),
  shift_id        uuid not null references shifts(id),
  user_id         uuid not null references users(id),
  created_at      timestamptz not null default now(),
  total           numeric(10,3) not null default 0,
  payment_method  text not null check (payment_method in ('cash','other'))
);

create index if not exists sales_shift_idx on sales(shift_id);
create index if not exists sales_created_idx on sales(created_at desc);

create table if not exists sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references sales(id) on delete restrict,
  product_id   uuid not null references products(id),
  qty          integer not null,
  unit_price   numeric(10,3) not null,
  unit_cost    numeric(10,3) not null
);

create index if not exists sale_items_sale_idx on sale_items(sale_id);
create index if not exists sale_items_product_idx on sale_items(product_id);

create table if not exists restocks (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id),
  qty         integer not null check (qty > 0),
  unit_cost   numeric(10,3) not null,
  supplier    text,
  created_at  timestamptz not null default now(),
  user_id     uuid not null references users(id)
);

create index if not exists restocks_product_idx on restocks(product_id);

create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id),
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  payload_json jsonb,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Triggers: atomic stock maintenance
-- =====================================================================

create or replace function sale_items_apply_stock()
returns trigger language plpgsql as $$
begin
  update products set stock = stock - NEW.qty where id = NEW.product_id;
  return NEW;
end $$;

drop trigger if exists t_sale_items_stock on sale_items;
create trigger t_sale_items_stock
after insert on sale_items
for each row execute function sale_items_apply_stock();

create or replace function restocks_apply_stock()
returns trigger language plpgsql as $$
begin
  update products
    set stock = stock + NEW.qty,
        cost_price = NEW.unit_cost
    where id = NEW.product_id;
  return NEW;
end $$;

drop trigger if exists t_restocks_stock on restocks;
create trigger t_restocks_stock
after insert on restocks
for each row execute function restocks_apply_stock();

-- Block UPDATE/DELETE on sales & sale_items: immutable.
create or replace function immutable_row() returns trigger language plpgsql as $$
begin
  raise exception 'rows in % are immutable', TG_TABLE_NAME;
end $$;

drop trigger if exists t_sales_immutable on sales;
create trigger t_sales_immutable
before update or delete on sales
for each row execute function immutable_row();

drop trigger if exists t_sale_items_immutable on sale_items;
create trigger t_sale_items_immutable
before update or delete on sale_items
for each row execute function immutable_row();

-- =====================================================================
-- View for worker: products without cost_price
-- =====================================================================

create or replace view products_public as
select
  id, name, category_id, sell_price, stock, low_stock_threshold,
  photo_url, barcode, archived, created_at
from products;

-- =====================================================================
-- RLS
-- =====================================================================
-- The Next.js app uses a custom JWT (not Supabase Auth), and calls Postgres
-- with the service role on the server. RLS is defense-in-depth — policies
-- use a session GAUC `app.user_role` set by the server per-request:
--   select set_config('app.user_role','worker',true);
--   select set_config('app.user_id','<uuid>',true);

create or replace function app_role() returns text language sql stable as $$
  select coalesce(current_setting('app.user_role', true), '')
$$;

create or replace function app_uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true),'')::uuid
$$;

-- RPC: server sets per-request session context in a single call.
create or replace function app_set_session(uid uuid, urole text)
returns void language plpgsql security definer as $$
begin
  perform set_config('app.user_id', uid::text, true);
  perform set_config('app.user_role', urole, true);
end $$;
revoke all on function app_set_session(uuid, text) from public;
grant execute on function app_set_session(uuid, text) to anon, authenticated, service_role;

alter table users       enable row level security;
alter table categories  enable row level security;
alter table products    enable row level security;
alter table shifts      enable row level security;
alter table sales       enable row level security;
alter table sale_items  enable row level security;
alter table restocks    enable row level security;
alter table audit_log   enable row level security;

-- owner full access on everything
create policy owner_all_users      on users       for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_categories on categories  for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_products   on products    for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_shifts     on shifts      for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_sales      on sales       for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_saleitems  on sale_items  for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_restocks   on restocks    for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_audit      on audit_log   for all using (app_role()='owner') with check (app_role()='owner');

-- worker: read categories
create policy worker_read_categories on categories for select using (app_role()='worker');

-- worker: read products via view only (products table denied)
-- (no worker policy on products → deny)
grant select on products_public to public;

-- worker: own open shift
create policy worker_insert_shift on shifts
  for insert with check (app_role()='worker' and user_id = app_uid());
create policy worker_update_own_open_shift on shifts
  for update using (app_role()='worker' and user_id = app_uid() and closed_at is null)
  with check (user_id = app_uid());
create policy worker_select_own_shift on shifts
  for select using (app_role()='worker' and user_id = app_uid());

-- worker: sales within own shift
create policy worker_insert_sale on sales
  for insert with check (
    app_role()='worker'
    and user_id = app_uid()
    and exists (select 1 from shifts s where s.id = shift_id and s.user_id = app_uid() and s.closed_at is null)
  );
create policy worker_select_own_sales on sales
  for select using (app_role()='worker' and user_id = app_uid());

create policy worker_insert_saleitem on sale_items
  for insert with check (
    app_role()='worker'
    and exists (select 1 from sales s where s.id = sale_id and s.user_id = app_uid())
  );
create policy worker_select_own_saleitems on sale_items
  for select using (
    app_role()='worker'
    and exists (select 1 from sales s where s.id = sale_id and s.user_id = app_uid())
  );
