-- ============================================================
-- SECURITY FIX SEC-04 + SEC-06 + SEC-07 (Auditoría v2)
--
-- SEC-04: Tablas services, doctors, pipeline_stages, pipeline_substages
--         sin RLS verificado en migraciones. Habilitar + crear políticas.
-- SEC-06: update_chat_templates_updated_at() sin search_path
-- SEC-07: platform_config SELECT USING(true) demasiado amplio
-- ============================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SEC-04: RLS para services, doctors, pipeline_stages/subs   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─── services ────────────────────────────────────────────────
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select" ON public.services
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

CREATE POLICY "services_insert" ON public.services
  FOR INSERT TO authenticated
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "services_update" ON public.services
  FOR UPDATE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  )
  WITH CHECK (clinica_id = public.get_user_clinica_id());

CREATE POLICY "services_delete" ON public.services
  FOR DELETE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

-- Platform Owner full access
CREATE POLICY "services_platform_owner" ON public.services
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ─── doctors ─────────────────────────────────────────────────
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctors_select" ON public.doctors
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

CREATE POLICY "doctors_insert" ON public.doctors
  FOR INSERT TO authenticated
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "doctors_update" ON public.doctors
  FOR UPDATE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  )
  WITH CHECK (clinica_id = public.get_user_clinica_id());

CREATE POLICY "doctors_delete" ON public.doctors
  FOR DELETE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "doctors_platform_owner" ON public.doctors
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ─── pipeline_stages ─────────────────────────────────────────
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_stages_select" ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

CREATE POLICY "pipeline_stages_insert" ON public.pipeline_stages
  FOR INSERT TO authenticated
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "pipeline_stages_update" ON public.pipeline_stages
  FOR UPDATE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  )
  WITH CHECK (clinica_id = public.get_user_clinica_id());

CREATE POLICY "pipeline_stages_delete" ON public.pipeline_stages
  FOR DELETE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "pipeline_stages_platform_owner" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ─── pipeline_substages (via parent stage) ───────────────────
ALTER TABLE public.pipeline_substages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_substages_select" ON public.pipeline_substages
  FOR SELECT TO authenticated
  USING (
    stage_id IN (
      SELECT id FROM public.pipeline_stages
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "pipeline_substages_insert" ON public.pipeline_substages
  FOR INSERT TO authenticated
  WITH CHECK (
    stage_id IN (
      SELECT id FROM public.pipeline_stages
      WHERE clinica_id = public.get_user_clinica_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "pipeline_substages_update" ON public.pipeline_substages
  FOR UPDATE TO authenticated
  USING (
    stage_id IN (
      SELECT id FROM public.pipeline_stages
      WHERE clinica_id = public.get_user_clinica_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  )
  WITH CHECK (
    stage_id IN (
      SELECT id FROM public.pipeline_stages
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

CREATE POLICY "pipeline_substages_delete" ON public.pipeline_substages
  FOR DELETE TO authenticated
  USING (
    stage_id IN (
      SELECT id FROM public.pipeline_stages
      WHERE clinica_id = public.get_user_clinica_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "pipeline_substages_platform_owner" ON public.pipeline_substages
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- ─── sucursales: cerrar lectura abierta ──────────────────────
-- Actualmente solo tiene políticas de PO. Agregar access para la clínica.
CREATE POLICY "sucursales_select_own_clinic" ON public.sucursales
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

CREATE POLICY "sucursales_update_admin" ON public.sucursales
  FOR UPDATE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  )
  WITH CHECK (clinica_id = public.get_user_clinica_id());

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SEC-06: Fix search_path en trigger function                ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION update_chat_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SEC-07: platform_config — Restringir lectura anónima       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Reemplazar la política abierta por una filtrada
DROP POLICY IF EXISTS "Anyone can read platform config" ON public.platform_config;
CREATE POLICY "Public can read branding only" ON public.platform_config
  FOR SELECT
  USING (key IN ('branding', 'public_settings'));

COMMIT;
