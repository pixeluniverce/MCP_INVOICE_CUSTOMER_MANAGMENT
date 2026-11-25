-- ==========================================================
-- UPDATE ONLY (for a database that already has the first schema).
-- Adds everything new: branches, prices, catalog, price lists, themes, bank details, linked-phone settings,
-- and the Employee Management System (EMS) tables.
-- Neon Console -> SQL Editor -> paste -> Run. Safe to run more than once.
-- ==========================================================

CREATE TABLE IF NOT EXISTS branches(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, address TEXT, mobile TEXT, gstin TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO branches(name) VALUES('Old Branch'),('New Branch') ON CONFLICT (name) DO NOTHING;
CREATE TABLE IF NOT EXISTS customer_prices(
  id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rate NUMERIC(14,2) NOT NULL CHECK (rate>=0), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(customer_id, product_id));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch_snapshot JSONB;
CREATE INDEX IF NOT EXISTS idx_inv_branch ON invoices(branch_id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gross_total NUMERIC(14,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS less_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS less_label TEXT;
UPDATE invoices SET gross_total=grand_total WHERE gross_total IS NULL;
CREATE TABLE IF NOT EXISTS invoice_revisions(
  id SERIAL PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id), edited_by INTEGER REFERENCES users(id), reason TEXT, snapshot JSONB,
  before_total NUMERIC(14,2), after_total NUMERIC(14,2), edited_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_rev_inv ON invoice_revisions(invoice_id);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS theme_primary TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS theme_sidebar_bg TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS theme_sidebar_text TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS theme_page_bg TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS inv_color TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS inv_show_logo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS inv_show_signature BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS signature_label TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_logo BOOLEAN;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_signature BOOLEAN;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_upi TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_bank BOOLEAN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_v INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_catalog BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS price_lists(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO price_lists(name) VALUES('Retail'),('Wholesale'),('Bulk') ON CONFLICT (name) DO NOTHING;
CREATE TABLE IF NOT EXISTS price_list_items(
  id SERIAL PRIMARY KEY, price_list_id INTEGER NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rate NUMERIC(14,2) NOT NULL CHECK (rate>=0), UNIQUE(price_list_id, product_id));
CREATE INDEX IF NOT EXISTS idx_pli_product ON price_list_items(product_id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_list_id INTEGER REFERENCES price_lists(id) ON DELETE SET NULL;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS catalog_show_prices BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS wa_mode TEXT DEFAULT 'cloud';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS wa_bridge_url TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS wa_bridge_key TEXT;
-- ===== Employee Management System (EMS) =====
create sequence if not exists emp_seq;
create table if not exists business_settings(key text primary key, value text not null);
insert into business_settings(key,value) values ('business_name','Mahadev Cement Product'),('weight_present','1'),('weight_half','0.5') on conflict (key) do nothing;
create table if not exists employee_groups(
  id serial primary key, name text unique not null, description text,
  active boolean not null default true, created_at timestamptz not null default now());
create table if not exists employees(
  id serial primary key,
  code text unique not null default ('EMP' || lpad(nextval('emp_seq')::text, 3, '0')),
  name text not null, mobile text, address text,
  joining_date date default current_date, notes text,
  active boolean not null default true,
  perm_group_id int references employee_groups(id) on delete set null,
  cycle_no int not null default 1,
  opening_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now());
create table if not exists items(
  id serial primary key, code text unique not null, name text not null,
  description text, unit text not null default 'pcs',
  rate numeric(12,2) not null check (rate >= 0),
  active boolean not null default true, created_at timestamptz not null default now());
create table if not exists item_rate_history(
  id serial primary key, item_id int not null references items(id) on delete cascade,
  rate numeric(12,2) not null, changed_at timestamptz not null default now());
create table if not exists daily_groups(
  id serial primary key, work_date date not null, name text not null,
  perm_group_id int references employee_groups(id) on delete set null,
  is_temporary boolean not null default false,
  finalized boolean not null default false, finalized_at timestamptz,
  pool numeric(14,2), undistributed numeric(14,2) not null default 0,
  created_at timestamptz not null default now(), unique (work_date, name));
create table if not exists daily_group_members(
  id serial primary key,
  daily_group_id int not null references daily_groups(id) on delete cascade,
  employee_id int not null references employees(id),
  work_date date not null,
  status text not null default 'Present' check (status in ('Present','Half Day','Absent','Leave')),
  unique (work_date, employee_id));
create table if not exists production_batches(
  id serial primary key, daily_group_id int not null references daily_groups(id) on delete cascade,
  notes text, created_at timestamptz not null default now());
create table if not exists production_batch_items(
  id serial primary key, batch_id int not null references production_batches(id) on delete cascade,
  item_id int not null references items(id),
  qty numeric(12,2) not null check (qty > 0),
  rate numeric(12,2) not null, amount numeric(14,2) not null);
create table if not exists employee_daily_distributions(
  id serial primary key,
  daily_group_id int not null references daily_groups(id) on delete cascade,
  employee_id int not null references employees(id),
  work_date date not null, pool numeric(14,2) not null,
  status text not null, weight numeric(6,2) not null, share numeric(14,2) not null,
  cycle int not null default 1,
  created_at timestamptz not null default now(), unique (daily_group_id, employee_id));
create table if not exists employee_advances(
  id serial primary key, employee_id int not null references employees(id),
  tx_date date not null, amount numeric(12,2) not null check (amount > 0),
  method text not null default 'Cash', reference text, notes text,
  cycle int not null default 1,
  created_at timestamptz not null default now());
create table if not exists employee_payments(
  id serial primary key, employee_id int not null references employees(id),
  tx_date date not null, amount numeric(12,2) not null check (amount > 0),
  method text not null default 'Cash', reference text, notes text,
  cycle int not null default 1,
  created_at timestamptz not null default now());
create table if not exists employee_cycles(
  id serial primary key, employee_id int not null references employees(id),
  cycle_no int not null, closed_on date not null,
  earned numeric(14,2) not null, advances numeric(14,2) not null, paid numeric(14,2) not null,
  final_payment numeric(14,2) not null default 0,
  created_at timestamptz not null default now(), unique (employee_id, cycle_no));
create table if not exists audit_logs(
  id serial primary key, action text not null, detail text, created_at timestamptz not null default now());
create index if not exists ix_dgm_emp on daily_group_members(employee_id, work_date);
create index if not exists ix_dgm_group on daily_group_members(daily_group_id);
create index if not exists ix_dg_date on daily_groups(work_date);
create index if not exists ix_pb_group on production_batches(daily_group_id);
create index if not exists ix_pbi_batch on production_batch_items(batch_id);
create index if not exists ix_pbi_item on production_batch_items(item_id);
create index if not exists ix_edd_emp on employee_daily_distributions(employee_id, work_date);
create index if not exists ix_adv_emp on employee_advances(employee_id, tx_date);
create index if not exists ix_pay_emp on employee_payments(employee_id, tx_date);
alter table employees add column if not exists cycle_no int not null default 1;
alter table employee_daily_distributions add column if not exists cycle int not null default 1;
alter table employee_advances add column if not exists cycle int not null default 1;
alter table employee_payments add column if not exists cycle int not null default 1;