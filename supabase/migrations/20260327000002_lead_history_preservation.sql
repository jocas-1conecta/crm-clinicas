-- ============================================================
-- Lead-to-Patient History Preservation
-- ============================================================

-- Add a reference from patient back to the original lead
ALTER TABLE patients ADD COLUMN IF NOT EXISTS converted_from_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Add a flag on leads to mark them as converted (instead of deleting)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_patients_converted_lead ON patients(converted_from_lead_id) WHERE converted_from_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(is_converted) WHERE is_converted = true;
