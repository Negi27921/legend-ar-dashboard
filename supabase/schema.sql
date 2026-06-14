-- Legend Rentals AR Command Center — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database

-- Contracts table: stores raw data from Speed ERP Excel exports
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_no TEXT UNIQUE NOT NULL,
  contract_type TEXT, -- Monthly, Weekly, Daily
  vehicle_no TEXT,
  make_model TEXT,
  customer_name TEXT,
  contact_number TEXT,
  customer_email TEXT,
  sales_person TEXT,
  start_date DATE,
  end_date DATE,
  expected_date DATE,
  branch TEXT,
  in_branch TEXT,
  collection_branch TEXT,
  daily_rate NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  outstanding_amount NUMERIC(12,2) DEFAULT 0,
  deposit_amount NUMERIC(12,2) DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'due_to_close_today', -- due_to_close_today, over_due_closing

  -- Action tracking (dashboard manages these)
  call_status TEXT NOT NULL DEFAULT 'not_called', -- not_called, called, no_answer, callback
  whatsapp_status TEXT NOT NULL DEFAULT 'not_sent', -- not_sent, sent, replied, failed
  action_taken TEXT NOT NULL DEFAULT 'none', -- none, extended, returning, closed, immobilised
  notes TEXT,

  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  upload_batch TEXT, -- identifies which upload session this came from

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(category);
CREATE INDEX IF NOT EXISTS idx_contracts_action ON contracts(action_taken);
CREATE INDEX IF NOT EXISTS idx_contracts_call ON contracts(call_status);
CREATE INDEX IF NOT EXISTS idx_contracts_whatsapp ON contracts(whatsapp_status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_agreement ON contracts(agreement_no);

-- Upload history table: tracks each CSV/Excel upload
CREATE TABLE IF NOT EXISTS upload_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id TEXT UNIQUE NOT NULL,
  filename TEXT,
  category TEXT, -- due_to_close_today, over_due_closing
  total_rows INTEGER,
  new_rows INTEGER,
  updated_rows INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action log table: audit trail of all actions taken on contracts
CREATE TABLE IF NOT EXISTS action_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  agreement_no TEXT,
  action_type TEXT NOT NULL, -- call_status_change, whatsapp_sent, status_change, note_added
  old_value TEXT,
  new_value TEXT,
  performed_by TEXT DEFAULT 'dashboard',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_log_contract ON action_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_action_log_time ON action_log(created_at);

-- Enable Row Level Security (but allow all for now via anon key)
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

-- Policies: allow full access via anon key (internal tool, not public-facing)
CREATE POLICY "Allow all on contracts" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on upload_history" ON upload_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on action_log" ON action_log FOR ALL USING (true) WITH CHECK (true);
