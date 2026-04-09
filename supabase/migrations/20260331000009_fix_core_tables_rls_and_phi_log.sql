-- ============================================================
-- SECURITY FIX H-06 + M-02 + M-04:
--   H-06: Políticas base de patients/leads/deals usan jwt tenant_id
--   M-02: appointments sin políticas RLS verificadas
--   M-04: Sin tabla de audit log para acceso a PHI
--
-- H-06 PROBLEMA: Las políticas originales en migration.sql usan:
--   auth.jwt()->>'tenant_id'
-- Supabase NO agrega automáticamente este claim al JWT.
-- Si nunca se configuró un Auth Hook para inyectarlo, estas
-- políticas evalúan a NULL y BLOQUEAN todo acceso (o peor,
-- si fueron las únicas políticas creadas, podrían estar rotas).
--
-- M-02 PROBLEMA: appointments tiene RLS habilitado pero NO se
-- encontraron políticas explícitas en las migraciones.
--
-- M-04 PROBLEMA: Sin registro de acceso a datos de pacientes
-- (requerido para cumplimiento HIPAA §164.312(b)).
--
-- SOLUCIÓN:
--   1. Reemplazar políticas jwt-based por get_user_clinica_id()
--   2. Crear políticas completas para appointments
--   3. Crear tabla phi_access_log con trigger en patients
-- ============================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  H-06: Migrar patients/leads/deals a get_user_clinica_id()  ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─── PATIENTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Aislamiento Tenant Pacientes" ON public.patients;

CREATE POLICY "patients_select_own_clinic" ON public.patients
  FOR SELECT TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "patients_insert_own_clinic" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "patients_update_own_clinic" ON public.patients
  FOR UPDATE TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "patients_delete_admins_only" ON public.patients
  FOR DELETE TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "patients_platform_owner" ON public.patients
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ─── LEADS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Aislamiento Tenant Leads" ON public.leads;

CREATE POLICY "leads_select_own_clinic" ON public.leads
  FOR SELECT TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "leads_insert_own_clinic" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "leads_update_own_clinic" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "leads_delete_admins_only" ON public.leads
  FOR DELETE TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "leads_platform_owner" ON public.leads
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ─── DEALS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Aislamiento Tenant Deals" ON public.deals;

CREATE POLICY "deals_select_own_clinic" ON public.deals
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "deals_insert_own_clinic" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "deals_update_own_clinic" ON public.deals
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "deals_delete_admins_only" ON public.deals
  FOR DELETE TO authenticated
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "deals_platform_owner" ON public.deals
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  M-02: appointments — Crear políticas RLS completas         ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_own_clinic" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "appointments_insert_own_clinic" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "appointments_update_own_clinic" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "appointments_delete_admins_only" ON public.appointments
  FOR DELETE TO authenticated
  USING (
    sucursal_id IN (
      SELECT id FROM public.sucursales
      WHERE clinica_id = public.get_user_clinica_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "appointments_platform_owner" ON public.appointments
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  M-04: PHI Access Log — Tabla de auditoría HIPAA            ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.phi_access_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL,
    clinica_id UUID,
    action TEXT NOT NULL,         -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,               -- campos modificados (solo en UPDATE/DELETE)
    accessed_at TIMESTAMPTZ DEFAULT now()
);

-- Solo lectura para Platform Owner, escritura solo por triggers SECURITY DEFINER
ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phi_log_select_platform_owner" ON public.phi_access_log
  FOR SELECT TO authenticated
  USING (public.is_platform_owner());

-- Sin políticas INSERT para authenticated — solo SECURITY DEFINER puede escribir

-- Índices para consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_phi_log_user ON public.phi_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_phi_log_clinica ON public.phi_access_log(clinica_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_phi_log_table ON public.phi_access_log(table_name, accessed_at DESC);

-- Trigger function para log automático
CREATE OR REPLACE FUNCTION public.log_phi_access()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.phi_access_log (user_id, clinica_id, action, table_name, record_id, old_data)
    VALUES (
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
        public.get_user_clinica_id(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE
          WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
          WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
            'old_name', OLD.name,
            'new_name', NEW.name
          )
          ELSE NULL
        END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar a tabla patients (PHI principal)
DROP TRIGGER IF EXISTS trg_patients_phi_log ON public.patients;
CREATE TRIGGER trg_patients_phi_log
    AFTER INSERT OR UPDATE OR DELETE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.log_phi_access();

COMMIT;
