-- ============================================================
-- SECURITY FIX H-02 + H-05:
--   H-02: get_user_clinica_id() no valida is_active
--   H-05: Funciones SECURITY DEFINER sin SET search_path
--
-- H-02 PROBLEMA: Un empleado desactivado (is_active = false)
-- sigue pudiendo acceder a todos los datos de su clínica porque
-- get_user_clinica_id() retorna clinica_id sin verificar is_active.
--
-- H-05 PROBLEMA: fn_track_stage_change() y cleanup_old_webhook_events()
-- son SECURITY DEFINER sin SET search_path, vulnerables a
-- search path injection.
--
-- SOLUCIÓN:
--   1. Reforzar get_user_clinica_id() con filtro is_active = true
--   2. Agregar search_path a las funciones que les falta
--   3. Agregar índice parcial para performance
-- ============================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  H-02: get_user_clinica_id() — Validar is_active            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Esta función es el pilar de TODO el sistema de aislamiento.
-- Agregar `is_active = true` desactiva automáticamente el acceso
-- de un usuario desactivado en TODAS las tablas que dependen de ella.

CREATE OR REPLACE FUNCTION get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT clinica_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND is_active = true   -- ← H-02: usuarios desactivados retornan NULL
    LIMIT 1;
$$;

-- Índice parcial para que el filtro is_active no impacte performance
CREATE INDEX IF NOT EXISTS idx_profiles_active_clinica
  ON public.profiles(id, clinica_id)
  WHERE is_active = true;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  H-05: Agregar search_path a funciones que les falta         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- fn_track_stage_change: trigger de auditoría del pipeline
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

    -- Resolve clinica_id for the audit log
    IF TG_ARGV[0] = 'lead' THEN
        SELECT s.clinica_id INTO v_clinica_id
        FROM public.sucursales s WHERE s.id = NEW.sucursal_id;
    ELSIF TG_ARGV[0] = 'deal' THEN
        SELECT s.clinica_id INTO v_clinica_id
        FROM public.patients p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE p.id = NEW.patient_id;
    ELSIF TG_ARGV[0] = 'appointment' THEN
        SELECT s.clinica_id INTO v_clinica_id
        FROM public.sucursales s WHERE s.id = NEW.sucursal_id;
    END IF;

    -- Insert audit log
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id
       OR OLD.substage_id IS DISTINCT FROM NEW.substage_id THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- cleanup_old_webhook_events: limpieza programada
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_webhook_events
  WHERE created_at < now() - interval '24 hours';
END;
$$;

COMMIT;
