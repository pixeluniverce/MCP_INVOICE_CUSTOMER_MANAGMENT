-- ==========================================================
-- UPDATE ONLY: adds Branches (Old/New) and Customer-wise product prices.
-- Run this ONLY if you already ran the earlier neon-schema.sql.
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