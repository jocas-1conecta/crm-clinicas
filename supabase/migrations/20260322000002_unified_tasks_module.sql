-- ============================================================
-- Migration: Unified Tasks Module
-- Creates crm_tasks table and migrates data from legacy 'tasks'
-- ============================================================

-- 1. Create the crm_tasks table
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'otro' CHECK (task_type IN ('llamada','mensaje','reunion','cotizacion','otro')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('alta','normal','baja')),
  due_date TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  -- Entity links (nullable — task can be linked to lead, patient, or be global)
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  -- Assignment & scoping
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
  -- Time fields (for reuniones/llamadas)
  start_time TEXT,
  end_time TEXT,
  -- Dynamic extra fields
  extra_fields JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Migrate data from legacy 'tasks' table into crm_tasks
INSERT INTO public.crm_tasks (
  title, due_date, is_completed,
  lead_id, patient_id,
  assigned_to, sucursal_id,
  task_type, completed_at, created_at
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
  CASE WHEN t.status = 'Realizada' THEN t.created_at ELSE NULL END,
  t.created_at
FROM public.tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_tasks ct
  WHERE ct.title = t.title
    AND ct.assigned_to = t.assigned_to
);

-- 3. Performance indexes
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
