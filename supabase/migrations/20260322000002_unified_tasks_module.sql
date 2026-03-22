-- ============================================================
-- Migration: Unified Tasks Module
-- Upgrades crm_tasks with types, priority, multi-entity support
-- Migrates data from legacy 'tasks' table
-- ============================================================

-- 1. Add new columns to crm_tasks
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'otro'
    CHECK (task_type IN ('llamada','mensaje','reunion','cotizacion','otro')),
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('alta','normal','baja')),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS extra_fields JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Migrate data from legacy 'tasks' table into crm_tasks
INSERT INTO public.crm_tasks (
  title, due_date, is_completed,
  lead_id, patient_id,
  assigned_to, sucursal_id,
  task_type, completed_at
)
SELECT
  t.title,
  (t.task_date::text || 'T' || COALESCE(t.task_time::text, '12:00:00') || 'Z')::timestamptz,
  t.status = 'Realizada',
  CASE WHEN t.rel_type = 'lead' THEN t.rel_id ELSE NULL END,
  CASE WHEN t.rel_type = 'patient' THEN t.rel_id ELSE NULL END,
  t.assigned_to,
  t.sucursal_id,
  'otro',
  CASE WHEN t.status = 'Realizada' THEN t.created_at ELSE NULL END
FROM public.tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_tasks ct
  WHERE ct.title = t.title
    AND ct.assigned_to = t.assigned_to
    AND ct.due_date = (t.task_date::text || 'T' || COALESCE(t.task_time::text, '12:00:00') || 'Z')::timestamptz
);

-- 3. Performance indexes for server-side pagination and filtering
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned
  ON public.crm_tasks(assigned_to, is_completed, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead
  ON public.crm_tasks(lead_id, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_patient
  ON public.crm_tasks(patient_id, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_sucursal
  ON public.crm_tasks(sucursal_id, is_completed, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_type
  ON public.crm_tasks(task_type, is_completed);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority
  ON public.crm_tasks(priority, is_completed, due_date);
