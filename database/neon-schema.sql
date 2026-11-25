-- ==========================================================
-- MAHADEV CEMENT PRODUCT - Neon PostgreSQL schema (FULL, new database)
-- Includes the invoice system AND the Employee Management System.
-- Neon Console -> SQL Editor -> paste this whole file -> Run. Safe to run more than once.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, mobile TEXT NOT NULL UNIQUE, alt_mobile TEXT, address TEXT, city TEXT, state TEXT, pin TEXT, gstin TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0, notes TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, whatsapp_optin BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('ADMIN','CUSTOMER')),
  customer_id INTEGER UNIQUE REFERENCES customers(id), must_change BOOLEAN NOT NULL DEFAULT FALSE, active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS products(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, hsn TEXT, rate NUMERIC(14,2) NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'Nos',
  gst_rate NUMERIC(6,3), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS company_settings(
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1), name TEXT, address TEXT, mobile TEXT, email TEXT, gstin TEXT, state TEXT, state_code TEXT,
  invoice_prefix TEXT DEFAULT 'INV-', next_invoice INTEGER DEFAULT 1, next_receipt INTEGER DEFAULT 1, next_challan INTEGER DEFAULT 1,
  payment_terms TEXT, gst_enabled BOOLEAN DEFAULT FALSE, gst_type TEXT DEFAULT 'CGST_SGST', cgst NUMERIC(6,3) DEFAULT 9, sgst NUMERIC(6,3) DEFAULT 9, igst NUMERIC(6,3) DEFAULT 18,
  wa_phone TEXT, wa_phone_id TEXT, wa_waba_id TEXT, wa_token TEXT, wa_verify_token TEXT, wa_app_secret TEXT, wa_api_version TEXT DEFAULT 'v21.0',
  wa_template_name TEXT, wa_template_lang TEXT DEFAULT 'en');
INSERT INTO company_settings(id,name,address,state,state_code,payment_terms) VALUES(1,'Mahadev Cement Product','Ahmedabad, Gujarat','Gujarat','24','Payment due within 30 days of invoice date.') ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS invoices(
  id SERIAL PRIMARY KEY, number TEXT NOT NULL UNIQUE, customer_id INTEGER NOT NULL REFERENCES customers(id), date DATE NOT NULL, due_date DATE,
  place_of_supply TEXT, gst_enabled BOOLEAN NOT NULL DEFAULT FALSE, gst_type TEXT NOT NULL DEFAULT 'NONE',
  subtotal NUMERIC(14,2) NOT NULL, discount_total NUMERIC(14,2) NOT NULL DEFAULT 0, taxable_total NUMERIC(14,2) NOT NULL,
  cgst_total NUMERIC(14,2) NOT NULL DEFAULT 0, sgst_total NUMERIC(14,2) NOT NULL DEFAULT 0, igst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_charges NUMERIC(14,2) NOT NULL DEFAULT 0, other_label TEXT, grand_total NUMERIC(14,2) NOT NULL, notes TEXT,
  customer_snapshot JSONB, status TEXT NOT NULL DEFAULT 'ACTIVE', created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS invoice_items(
  id SERIAL PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, hsn TEXT,
  qty NUMERIC(14,3) NOT NULL, unit TEXT, rate NUMERIC(14,2) NOT NULL, discount NUMERIC(14,2) NOT NULL DEFAULT 0, amount NUMERIC(14,2) NOT NULL, taxable NUMERIC(14,2) NOT NULL,
  cgst_rate NUMERIC(6,3) NOT NULL DEFAULT 0, sgst_rate NUMERIC(6,3) NOT NULL DEFAULT 0, igst_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  cgst_amt NUMERIC(14,2) NOT NULL DEFAULT 0, sgst_amt NUMERIC(14,2) NOT NULL DEFAULT 0, igst_amt NUMERIC(14,2) NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS payments(
  id SERIAL PRIMARY KEY, receipt_no TEXT NOT NULL UNIQUE, customer_id INTEGER NOT NULL REFERENCES customers(id), date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount>0), mode TEXT NOT NULL, reference TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE',
  reversed_at TIMESTAMPTZ, reverse_reason TEXT, created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS payment_allocations(
  id SERIAL PRIMARY KEY, payment_id INTEGER NOT NULL REFERENCES payments(id), invoice_id INTEGER NOT NULL REFERENCES invoices(id), amount NUMERIC(14,2) NOT NULL CHECK (amount>0));
CREATE TABLE IF NOT EXISTS delivery_challans(
  id SERIAL PRIMARY KEY, number TEXT NOT NULL UNIQUE, customer_id INTEGER NOT NULL REFERENCES customers(id), date DATE NOT NULL, vehicle_no TEXT, transport TEXT, notes TEXT,
  customer_snapshot JSONB, created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS challan_items(
  id SERIAL PRIMARY KEY, challan_id INTEGER NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, qty NUMERIC(14,3) NOT NULL, unit TEXT);
CREATE TABLE IF NOT EXISTS whatsapp_messages(
  id SERIAL PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), mobile TEXT NOT NULL, type TEXT NOT NULL, ref_id INTEGER, ref_label TEXT, wa_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', error TEXT, sent_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events(id SERIAL PRIMARY KEY, payload JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS activity_logs(id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, details TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS login_attempts(id SERIAL PRIMARY KEY, username TEXT NOT NULL, ip TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_inv_cust ON invoices(customer_id, date);
CREATE INDEX IF NOT EXISTS idx_inv_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_items_inv ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_cust ON payments(customer_id, date);
CREATE INDEX IF NOT EXISTS idx_pay_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_alloc_inv ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_alloc_pay ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_wa_cust ON whatsapp_messages(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wa_mid ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_chal_cust ON delivery_challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_login_att ON login_attempts(username, created_at);
CREATE INDEX IF NOT EXISTS idx_cust_name ON customers(lower(name));
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

-- First admin login: username admin / temporary password Admin@12345 (must be changed at first login)
INSERT INTO users(username, password_hash, role, must_change)
SELECT 'admin', crypt('Admin@12345', gen_salt('bf', 10)), 'ADMIN', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='ADMIN');
