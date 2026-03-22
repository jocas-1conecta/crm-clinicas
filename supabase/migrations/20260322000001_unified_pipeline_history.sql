-- ============================================================
-- Migration: Pipeline Architecture Improvements
-- Adapted to EXISTING pipeline_history_log schema
-- (uses lead_id / deal_id / appointment_id FK columns)
-- ============================================================

-- ============================================================
-- FASE 1: Data Integrity
-- ============================================================

-- 1. Add clinica_id to pipeline_history_log for RLS and tenant isolation
ALTER TABLE public.pipeline_history_log
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;

-- Backfill clinica_id from leads
UPDATE public.pipeline_history_log phl
SET clinica_id = s.clinica_id
FROM public.leads l
JOIN public.sucursales s ON s.id = l.sucursal_id
WHERE phl.lead_id = l.id
  AND phl.clinica_id IS NULL;

-- Backfill clinica_id from deals (via patient → sucursal)
UPDATE public.pipeline_history_log phl
SET clinica_id = s.clinica_id
FROM public.deals d
JOIN public.patients p ON p.id = d.patient_id
JOIN public.sucursales s ON s.id = p.sucursal_id
WHERE phl.deal_id = d.id
  AND phl.clinica_id IS NULL;

-- Backfill clinica_id from appointments
UPDATE public.pipeline_history_log phl
SET clinica_id = s.clinica_id
FROM public.appointments a
JOIN public.sucursales s ON s.id = a.sucursal_id
WHERE phl.appointment_id = a.id
  AND phl.clinica_id IS NULL;

-- Index for pipeline_history_log queries
CREATE INDEX IF NOT EXISTS idx_phl_lead ON public.pipeline_history_log(lead_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_phl_deal ON public.pipeline_history_log(deal_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_phl_appointment ON public.pipeline_history_log(appointment_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_phl_clinica_time ON public.pipeline_history_log(clinica_id, changed_at DESC);

-- 2. Automatic trigger: update stage_entered_at + insert audit log
CREATE OR REPLACE FUNCTION public.fn_track_stage_change()
RETURNS TRIGGER AS $$
DECLARE
    v_clinica_id UUID;
BEGIN
    -- Only fire when stage or substage actually changes
    IF (OLD.stage_id IS NOT DISTINCT FROM NEW.stage_id
        AND OLD.substage_id IS NOT DISTINCT FROM NEW.substage_id) THEN
        RETURN NEW;
    END IF;

    -- Update stage_entered_at automatically
    NEW.stage_entered_at = now();

    -- Resolve clinica_id depending on table
    IF TG_ARGV[0] = 'deal' THEN
        SELECT s.clinica_id INTO v_clinica_id
        FROM public.patients p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE p.id = NEW.patient_id;
    ELSE
        SELECT clinica_id INTO v_clinica_id
        FROM public.sucursales
        WHERE id = NEW.sucursal_id;
    END IF;

    -- Fallback: resolve from the stage itself
    IF v_clinica_id IS NULL THEN
        SELECT clinica_id INTO v_clinica_id
        FROM public.pipeline_stages
        WHERE id = COALESCE(NEW.stage_id, OLD.stage_id);
    END IF;

    -- Insert audit log using the appropriate FK column
    IF v_clinica_id IS NOT NULL THEN
        IF TG_ARGV[0] = 'lead' THEN
            INSERT INTO public.pipeline_history_log (
                lead_id, from_stage_id, to_stage_id,
                from_substage_id, to_substage_id,
                changed_by, clinica_id
            ) VALUES (
                NEW.id, OLD.stage_id, NEW.stage_id,
                OLD.substage_id, NEW.substage_id,
                auth.uid(), v_clinica_id
            );
        ELSIF TG_ARGV[0] = 'deal' THEN
            INSERT INTO public.pipeline_history_log (
                deal_id, from_stage_id, to_stage_id,
                from_substage_id, to_substage_id,
                changed_by, clinica_id
            ) VALUES (
                NEW.id, OLD.stage_id, NEW.stage_id,
                OLD.substage_id, NEW.substage_id,
                auth.uid(), v_clinica_id
            );
        ELSIF TG_ARGV[0] = 'appointment' THEN
            INSERT INTO public.pipeline_history_log (
                appointment_id, from_stage_id, to_stage_id,
                from_substage_id, to_substage_id,
                changed_by, clinica_id
            ) VALUES (
                NEW.id, OLD.stage_id, NEW.stage_id,
                OLD.substage_id, NEW.substage_id,
                auth.uid(), v_clinica_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to all 3 entities
DROP TRIGGER IF EXISTS trg_lead_stage_change ON public.leads;
CREATE TRIGGER trg_lead_stage_change
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.fn_track_stage_change('lead');

DROP TRIGGER IF EXISTS trg_deal_stage_change ON public.deals;
CREATE TRIGGER trg_deal_stage_change
    BEFORE UPDATE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.fn_track_stage_change('deal');

DROP TRIGGER IF EXISTS trg_appointment_stage_change ON public.appointments;
CREATE TRIGGER trg_appointment_stage_change
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.fn_track_stage_change('appointment');

-- 3. Add clinica_id to stage_transition_rules
ALTER TABLE public.stage_transition_rules
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;

-- Backfill from target_stage_id
UPDATE public.stage_transition_rules str
SET clinica_id = ps.clinica_id
FROM public.pipeline_stages ps
WHERE ps.id = str.target_stage_id
  AND str.clinica_id IS NULL;

-- Backfill from target_substage_id
UPDATE public.stage_transition_rules str
SET clinica_id = ps.clinica_id
FROM public.pipeline_substages psub
JOIN public.pipeline_stages ps ON ps.id = psub.stage_id
WHERE psub.id = str.target_substage_id
  AND str.clinica_id IS NULL;

-- 4. RLS for pipeline_history_log
ALTER TABLE public.pipeline_history_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own clinic history" ON public.pipeline_history_log;
CREATE POLICY "Users can view own clinic history"
    ON public.pipeline_history_log FOR SELECT
    USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "System can insert history" ON public.pipeline_history_log;
CREATE POLICY "System can insert history"
    ON public.pipeline_history_log FOR INSERT
    WITH CHECK (true);

-- 5. RLS for stage_transition_rules
ALTER TABLE public.stage_transition_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own clinic rules" ON public.stage_transition_rules;
CREATE POLICY "Users see own clinic rules"
    ON public.stage_transition_rules FOR SELECT
    USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "Admins manage own clinic rules" ON public.stage_transition_rules;
CREATE POLICY "Admins manage own clinic rules"
    ON public.stage_transition_rules FOR ALL
    USING (clinica_id = public.get_user_clinica_id());

-- 6. Add closed_by to deals and appointments
ALTER TABLE public.deals
    ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(id);


-- ============================================================
-- FASE 2: Performance Indexes
-- ============================================================

-- Stage-based indexes for Kanban board queries
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_appointments_stage ON public.appointments(stage_id);

-- Substage indexes for SLA filtering
CREATE INDEX IF NOT EXISTS idx_leads_substage ON public.leads(substage_id);
CREATE INDEX IF NOT EXISTS idx_deals_substage ON public.deals(substage_id);
CREATE INDEX IF NOT EXISTS idx_appointments_substage ON public.appointments(substage_id);

-- Composite indexes for branch + stage (most common Kanban query)
CREATE INDEX IF NOT EXISTS idx_leads_sucursal_stage ON public.leads(sucursal_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_appointments_sucursal_stage ON public.appointments(sucursal_id, stage_id);
