-- ============================================================
-- Chat-Contact Bidirectional Mapping
-- Links Timelines AI chats to CRM leads/patients by phone
-- Used for asesor-level chat visibility filtering
-- ============================================================

BEGIN;

-- ─── Mapping table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_contact_map (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id TEXT NOT NULL,
    chat_phone TEXT,                -- normalized phone from the chat
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    auto_matched BOOLEAN DEFAULT true,   -- false if manually linked
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chat_id, clinica_id)
);

ALTER TABLE public.chat_contact_map ENABLE ROW LEVEL SECURITY;

-- ─── RLS: clinic isolation ──────────────────────────────────
CREATE POLICY "chat_contact_map_clinic"
  ON public.chat_contact_map
  FOR ALL TO authenticated
  USING (clinica_id = public.get_user_clinica_id())
  WITH CHECK (clinica_id = public.get_user_clinica_id());

CREATE POLICY "chat_contact_map_platform_owner"
  ON public.chat_contact_map
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ccm_chat ON public.chat_contact_map(chat_id);
CREATE INDEX IF NOT EXISTS idx_ccm_lead ON public.chat_contact_map(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ccm_patient ON public.chat_contact_map(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ccm_clinica ON public.chat_contact_map(clinica_id);

COMMIT;
