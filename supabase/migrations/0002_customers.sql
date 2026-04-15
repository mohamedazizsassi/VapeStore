-- Credit customers: named accounts that sellers can sell to on credit.
-- Balance = sum(credit sales) - sum(payments).

-- =====================================================================
-- Tables
-- =====================================================================

create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  note        text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists customers_name_ci_uniq
  on customers (lower(name)) where archived = false;

create table if not exists customer_payments (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  amount      numeric(10,3) not null check (amount > 0),
  user_id     uuid not null references users(id),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists customer_payments_customer_idx on customer_payments(customer_id);

-- Extend sales with optional credit customer & allow 'credit' payment_method.
alter table sales
  add column if not exists customer_id uuid references customers(id);

create index if not exists sales_customer_idx on sales(customer_id);

alter table sales drop constraint if exists sales_payment_method_check;
alter table sales add constraint sales_payment_method_check
  check (payment_method in ('cash','other','credit'));

-- Guarantee: credit sales must name a customer; non-credit must not.
alter table sales drop constraint if exists sales_credit_needs_customer;
alter table sales add constraint sales_credit_needs_customer check (
  (payment_method = 'credit' and customer_id is not null)
  or (payment_method <> 'credit' and customer_id is null)
);

-- =====================================================================
-- Balance view
-- =====================================================================

create or replace view customer_balances as
select
  c.id,
  c.name,
  c.phone,
  c.archived,
  coalesce(sc.charged, 0) - coalesce(pp.paid, 0) as balance,
  coalesce(sc.charged, 0) as charged,
  coalesce(pp.paid, 0) as paid,
  sc.last_sale_at,
  pp.last_payment_at
from customers c
left join (
  select customer_id, sum(total) as charged, max(created_at) as last_sale_at
  from sales where payment_method = 'credit' group by customer_id
) sc on sc.customer_id = c.id
left join (
  select customer_id, sum(amount) as paid, max(created_at) as last_payment_at
  from customer_payments group by customer_id
) pp on pp.customer_id = c.id;

grant select on customer_balances to public;

-- =====================================================================
-- RLS
-- =====================================================================

alter table customers          enable row level security;
alter table customer_payments  enable row level security;

-- owner: full access
create policy owner_all_customers on customers
  for all using (app_role()='owner') with check (app_role()='owner');
create policy owner_all_customer_payments on customer_payments
  for all using (app_role()='owner') with check (app_role()='owner');

-- worker: read non-archived customers only (for the picker)
create policy worker_read_customers on customers
  for select using (app_role()='worker' and archived = false);

-- Workers INSERT sales with customer_id through existing policy (worker_insert_sale);
-- the DB constraint ensures customer_id is set iff payment_method='credit'.
