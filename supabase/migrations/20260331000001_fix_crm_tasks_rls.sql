-- ============================================================
-- SECURITY FIX C-01: crm_tasks — Eliminar fuga de tareas globales
-- 
-- PROBLEMA: La cláusula `OR sucursal_id IS NULL` en la política
-- única de crm_tasks permite que CUALQUIER usuario autenticado
-- de CUALQUIER clínica lea, modifique y elimine tareas que no
-- tengan sucursal_id asignado.
--
-- SOLUCIÓN: Reemplazar la política única por 3 políticas
-- específicas que aíslan por tenant en todos los escenarios:
--   1. Tareas vinculadas a una sucursal → aisladas por clínica
--   2. Tareas vinculadas a un lead → heredan el tenant del lead
--   3. Tareas vinculadas a un paciente → heredan el tenant del paciente
-- ============================================================

BEGIN;

-- 1. Eliminar la política vulnerable
DROP POLICY IF EXISTS "crm_tasks_admin_access" ON public.crm_tasks;

-- 2. Tareas con sucursal_id: solo usuarios de la misma clínica
CREATE POLICY "crm_tasks_by_sucursal" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (
    sucursal_id IS NOT NULL
    AND sucursal_id IN (
      SELECT s.id FROM public.sucursales s
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    sucursal_id IS NOT NULL
    AND sucursal_id IN (
      SELECT s.id FROM public.sucursales s
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

-- 3. Tareas sin sucursal pero con lead_id: heredan el tenant del lead
CREATE POLICY "crm_tasks_by_lead" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (
    sucursal_id IS NULL
    AND lead_id IS NOT NULL
    AND lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.sucursales s ON s.id = l.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    sucursal_id IS NULL
    AND lead_id IS NOT NULL
    AND lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.sucursales s ON s.id = l.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

-- 4. Tareas sin sucursal pero con patient_id: heredan el tenant del paciente
CREATE POLICY "crm_tasks_by_patient" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (
    sucursal_id IS NULL
    AND patient_id IS NOT NULL
    AND patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    sucursal_id IS NULL
    AND patient_id IS NOT NULL
    AND patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

-- 5. Platform Owner: acceso total a todas las tareas
CREATE POLICY "crm_tasks_platform_owner" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

COMMIT;
