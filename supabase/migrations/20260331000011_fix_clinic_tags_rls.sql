-- ============================================================
-- SECURITY FIX L-01: clinic_tags/entity_tags — Estandarizar RLS
--
-- PROBLEMA: Las políticas de clinic_tags y entity_tags acceden
-- directamente a la tabla profiles con subconsultas, creando
-- riesgo de recursión RLS y un patrón inconsistente con el
-- resto del sistema.
--
-- SOLUCIÓN: Reemplazar por get_user_clinica_id() estándar.
-- ============================================================

BEGIN;

-- ─── clinic_tags ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own clinic tags" ON public.clinic_tags;
CREATE POLICY "clinic_tags_select" ON public.clinic_tags
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "Admins can manage clinic tags" ON public.clinic_tags;

CREATE POLICY "clinic_tags_insert" ON public.clinic_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

CREATE POLICY "clinic_tags_update" ON public.clinic_tags
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

CREATE POLICY "clinic_tags_delete" ON public.clinic_tags
  FOR DELETE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

-- ─── entity_tags ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read entity tags" ON public.entity_tags;
CREATE POLICY "entity_tags_select" ON public.entity_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_tags ct
      WHERE ct.id = entity_tags.tag_id
      AND ct.clinica_id = public.get_user_clinica_id()
    )
  );

DROP POLICY IF EXISTS "Users can manage entity tags" ON public.entity_tags;
CREATE POLICY "entity_tags_manage" ON public.entity_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_tags ct
      WHERE ct.id = entity_tags.tag_id
      AND ct.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_tags ct
      WHERE ct.id = entity_tags.tag_id
      AND ct.clinica_id = public.get_user_clinica_id()
    )
  );

COMMIT;
