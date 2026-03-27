-- ============================================================
-- Per-Clinic Tags System
-- ============================================================

-- 1. Tag definitions per clinic
CREATE TABLE IF NOT EXISTS clinic_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6b7280',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinica_id, name)
);

-- 2. Many-to-many junction: tag ↔ entity
CREATE TABLE IF NOT EXISTS entity_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES clinic_tags(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'patient', 'appointment')),
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tag_id, entity_type, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinic_tags_clinica ON clinic_tags(clinica_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags(tag_id);

-- ============================================================
-- RLS: clinic_tags
-- ============================================================
ALTER TABLE clinic_tags ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user in the same clinic
CREATE POLICY "Users can read own clinic tags"
ON clinic_tags FOR SELECT
USING (
    clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid())
);

-- Write: Admin_Clinica, Director_Clinica, Super_Admin
CREATE POLICY "Admins can manage clinic tags"
ON clinic_tags FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND clinica_id = clinic_tags.clinica_id
        AND role IN ('Admin_Clinica', 'Super_Admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND clinica_id = clinic_tags.clinica_id
        AND role IN ('Admin_Clinica', 'Super_Admin')
    )
);

-- ============================================================
-- RLS: entity_tags
-- ============================================================
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can read the tag can read the assignment
CREATE POLICY "Users can read entity tags"
ON entity_tags FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM clinic_tags ct
        JOIN profiles p ON p.clinica_id = ct.clinica_id
        WHERE ct.id = entity_tags.tag_id AND p.id = auth.uid()
    )
);

-- Write: any authenticated user in the same clinic can assign/remove tags
CREATE POLICY "Users can manage entity tags"
ON entity_tags FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM clinic_tags ct
        JOIN profiles p ON p.clinica_id = ct.clinica_id
        WHERE ct.id = entity_tags.tag_id AND p.id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM clinic_tags ct
        JOIN profiles p ON p.clinica_id = ct.clinica_id
        WHERE ct.id = entity_tags.tag_id AND p.id = auth.uid()
    )
);
