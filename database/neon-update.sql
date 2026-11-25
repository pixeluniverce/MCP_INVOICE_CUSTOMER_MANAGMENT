-- ==========================================================
-- UPDATE ONLY (for a database that already has the first schema).
-- Adds: Branches, customer prices, invoice Less amount, edit history, logo, signature, theme +
-- invoice colours, bank details, product catalog (photos), 3 price lists, linked-phone WhatsApp settings.
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