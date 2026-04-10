-- ============================================================
-- Migration: Fix Admin RLS — Unified Policy
--
-- PROBLEM: The 3 separate admin policies (by_sucursal, by_lead,
-- by_patient) left a gap: tasks where sucursal_id IS NULL AND
-- lead_id IS NULL AND patient_id IS NULL could not be created
-- or read by admins. This blocked task creation from the UI.
--
-- SOLUTION: Replace all 3 with 1 unified policy that uses
-- OR logic, including a catch-all clause for tasks that only
-- have assigned_to set (common for standalone tasks created
-- from the task dashboard).
-- ============================================================

BEGIN;

-- Drop the 3 separate admin policies
DROP POLICY IF EXISTS "crm_tasks_admin_by_sucursal" ON public.crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_admin_by_lead"     ON public.crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_admin_by_patient"  ON public.crm_tasks;

-- Create unified admin policy
CREATE POLICY "crm_tasks_admin_access" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND (
      -- Via sucursal
      (sucursal_id IS NOT NULL AND sucursal_id IN (
        SELECT s.id FROM public.sucursales s
        WHERE s.clinica_id = public.get_user_clinica_id()
      ))
      OR
      -- Via lead
      (lead_id IS NOT NULL AND lead_id IN (
        SELECT l.id FROM public.leads l
        JOIN public.sucursales s ON s.id = l.sucursal_id
        WHERE s.clinica_id = public.get_user_clinica_id()
      ))
      OR
      -- Via patient
      (patient_id IS NOT NULL AND patient_id IN (
        SELECT p.id FROM public.patients p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE s.clinica_id = public.get_user_clinica_id()
      ))
      OR
      -- Catch-all: assigned to a team member within the same clinic
      (assigned_to IS NOT NULL AND assigned_to IN (
        SELECT pr.id FROM public.profiles pr
        WHERE pr.clinica_id = public.get_user_clinica_id()
      ))
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND (
      (sucursal_id IS NOT NULL AND sucursal_id IN (
        SELECT s.id FROM public.sucursales s
        WHERE s.clinica_id = public.get_user_clinica_id()
      ))
      OR
      (lead_id IS NOT NULL AND lead_id IN (
        SELECT l.id FROM public.leads l
        JOIN public.sucursales s ON s.id = l.sucursal_id
        WHERE s.clinica_id = public.get_user_clinica_id()
      ))
      OR
      (patient_id IS NOT NULL AND patient_id IN (
        SELECT p.id FROM public.patients p
        JOIN public.sucursales s ON s.id = p.sucursal_id
        WHERE s.clinica_id = public.get_user_clinica_id()
      ))
      OR
      (assigned_to IS NOT NULL AND assigned_to IN (
        SELECT pr.id FROM public.profiles pr
        WHERE pr.clinica_id = public.get_user_clinica_id()
      ))
    )
  );

COMMIT;
