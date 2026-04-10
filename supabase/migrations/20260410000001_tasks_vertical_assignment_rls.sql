-- ============================================================
-- Migration: Vertical Assignment RLS for crm_tasks
-- 
-- PROBLEM: Current RLS policies isolate by tenant (clinica_id)
-- but don't enforce role-based visibility within a clinic.
-- An Asesor_Sucursal can currently see ALL tasks in their clinic,
-- not just tasks assigned to them.
--
-- SOLUTION: 
-- 1. Create get_user_role() helper function
-- 2. Replace the broad "FOR ALL" policies with role-specific ones:
--    - Super_Admin / Admin_Clinica: full access within their clinic
--    - Asesor_Sucursal: only tasks where assigned_to = auth.uid()
--    - Platform_Owner: already has full access via existing policy
-- ============================================================

BEGIN;

-- ─── 1. Helper: get_user_role() ──────────────────────────────
-- Returns the role of the authenticated user from profiles.
-- SECURITY DEFINER to bypass RLS on profiles (same pattern as get_user_clinica_id).
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$;

-- ─── 2. Drop existing tenant-only policies ───────────────────
-- These will be replaced with role-aware equivalents
DROP POLICY IF EXISTS "crm_tasks_by_sucursal" ON public.crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_by_lead" ON public.crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_by_patient" ON public.crm_tasks;
-- Keep platform_owner policy (already correct)

-- ─── 3. Admin policies (Super_Admin + Admin_Clinica) ─────────
-- Full access to ALL tasks within their clinic, via sucursal
CREATE POLICY "crm_tasks_admin_by_sucursal" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND sucursal_id IS NOT NULL
    AND sucursal_id IN (
      SELECT s.id FROM public.sucursales s
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND sucursal_id IS NOT NULL
    AND sucursal_id IN (
      SELECT s.id FROM public.sucursales s
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

-- Admin: tasks linked to leads (no sucursal_id)
CREATE POLICY "crm_tasks_admin_by_lead" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND sucursal_id IS NULL
    AND lead_id IS NOT NULL
    AND lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.sucursales s ON s.id = l.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND sucursal_id IS NULL
    AND lead_id IS NOT NULL
    AND lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.sucursales s ON s.id = l.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

-- Admin: tasks linked to patients (no sucursal_id)
CREATE POLICY "crm_tasks_admin_by_patient" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND sucursal_id IS NULL
    AND patient_id IS NOT NULL
    AND patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND sucursal_id IS NULL
    AND patient_id IS NOT NULL
    AND patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
  );

-- ─── 4. Asesor policies (only own tasks) ─────────────────────
-- Asesor: SELECT only tasks assigned to them
CREATE POLICY "crm_tasks_asesor_select" ON public.crm_tasks
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Asesor_Sucursal'
    AND assigned_to = auth.uid()
  );

-- Asesor: INSERT — must assign to themselves
CREATE POLICY "crm_tasks_asesor_insert" ON public.crm_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'Asesor_Sucursal'
    AND assigned_to = auth.uid()
  );

-- Asesor: UPDATE — only their own tasks, can't reassign
CREATE POLICY "crm_tasks_asesor_update" ON public.crm_tasks
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'Asesor_Sucursal'
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'Asesor_Sucursal'
    AND assigned_to = auth.uid()
  );

-- Asesor: DELETE — only their own tasks
CREATE POLICY "crm_tasks_asesor_delete" ON public.crm_tasks
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'Asesor_Sucursal'
    AND assigned_to = auth.uid()
  );

COMMIT;
