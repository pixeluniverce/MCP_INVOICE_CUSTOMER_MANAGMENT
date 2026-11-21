-- ==========================================================
-- UPDATE ONLY (for a database that already has the first schema).
-- Adds: Branches, customer-wise prices, invoice Less amount, edit history, company logo.
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