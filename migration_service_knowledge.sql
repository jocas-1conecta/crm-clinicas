-- ============================================================
-- Service Knowledge Base + Service Enhancements — Migration
-- ============================================================

-- 1. Add new columns to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS greeting TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Service Q&A Knowledge Base (conversational scripts per service)
CREATE TABLE IF NOT EXISTS service_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_knowledge_service ON service_knowledge(service_id);
CREATE INDEX IF NOT EXISTS idx_service_knowledge_clinica ON service_knowledge(clinica_id);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE service_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_knowledge_select ON service_knowledge FOR SELECT
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY service_knowledge_insert ON service_knowledge FOR INSERT
    WITH CHECK (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY service_knowledge_update ON service_knowledge FOR UPDATE
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY service_knowledge_delete ON service_knowledge FOR DELETE
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
