-- ============================================================
-- Migration: Task Attachments
--
-- Adds file attachment capability to CRM tasks.
-- Creates a relational table + Supabase Storage bucket with
-- tenant-isolated RLS policies (same pattern as logos/avatars).
-- ============================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  1. TABLE: crm_task_attachments                             ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.crm_task_attachments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT,          -- MIME type (e.g. image/jpeg, application/pdf)
  file_size   INTEGER,       -- Size in bytes
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Performance index: list attachments by task
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id
  ON public.crm_task_attachments(task_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  2. RLS on crm_task_attachments                             ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE public.crm_task_attachments ENABLE ROW LEVEL SECURITY;

-- Asesor: can manage attachments on tasks assigned to them
CREATE POLICY "task_attachments_asesor_access"
  ON public.crm_task_attachments
  FOR ALL TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.crm_tasks t
      WHERE t.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.crm_tasks t
      WHERE t.assigned_to = auth.uid()
    )
  );

-- Admin: can manage attachments on tasks within their clinic
CREATE POLICY "task_attachments_admin_access"
  ON public.crm_task_attachments
  FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND task_id IN (
      SELECT t.id FROM public.crm_tasks t
      WHERE
        -- Via sucursal
        (t.sucursal_id IS NOT NULL AND t.sucursal_id IN (
          SELECT s.id FROM public.sucursales s
          WHERE s.clinica_id = public.get_user_clinica_id()
        ))
        OR
        -- Via assigned team member
        (t.assigned_to IS NOT NULL AND t.assigned_to IN (
          SELECT pr.id FROM public.profiles pr
          WHERE pr.clinica_id = public.get_user_clinica_id()
        ))
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('Super_Admin', 'Admin_Clinica')
    AND task_id IN (
      SELECT t.id FROM public.crm_tasks t
      WHERE
        (t.sucursal_id IS NOT NULL AND t.sucursal_id IN (
          SELECT s.id FROM public.sucursales s
          WHERE s.clinica_id = public.get_user_clinica_id()
        ))
        OR
        (t.assigned_to IS NOT NULL AND t.assigned_to IN (
          SELECT pr.id FROM public.profiles pr
          WHERE pr.clinica_id = public.get_user_clinica_id()
        ))
    )
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  3. STORAGE BUCKET: task-attachments                        ║
-- ╚══════════════════════════════════════════════════════════════╝

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-attachments', 'task-attachments', true, 10485760)  -- 10 MB limit
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 10485760;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  4. STORAGE RLS — path-based tenant isolation               ║
-- ║     Path pattern: {clinica_id}/{task_id}/{filename}         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- SELECT: any authenticated user can read (public bucket)
CREATE POLICY "task_attachments_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-attachments');

-- INSERT: only files under your own clinica_id prefix
CREATE POLICY "task_attachments_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND name LIKE public.get_user_clinica_id()::text || '/%'
  );

-- UPDATE: only files under your own clinica_id prefix
CREATE POLICY "task_attachments_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND name LIKE public.get_user_clinica_id()::text || '/%'
  )
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND name LIKE public.get_user_clinica_id()::text || '/%'
  );

-- DELETE: only files under your own clinica_id prefix
CREATE POLICY "task_attachments_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND name LIKE public.get_user_clinica_id()::text || '/%'
  );

COMMIT;
