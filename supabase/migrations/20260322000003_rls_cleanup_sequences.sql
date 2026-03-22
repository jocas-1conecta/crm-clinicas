-- ============================================================
-- Migration: RLS + Legacy Cleanup + Task Sequences
-- 1. RLS policies for crm_tasks
-- 2. Drop legacy 'tasks' table
-- 3. Task Sequences automation tables
-- ============================================================

-- ─── 1. RLS for crm_tasks ─────────────────────────────────────
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- Admin_Clinica & Super_Admin: full access to tasks in their clinic
CREATE POLICY "crm_tasks_admin_access" ON public.crm_tasks
  FOR ALL
  TO authenticated
  USING (
    sucursal_id IN (
      SELECT s.id FROM public.sucursales s
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
    OR sucursal_id IS NULL  -- global tasks without sucursal
  )
  WITH CHECK (
    sucursal_id IN (
      SELECT s.id FROM public.sucursales s
      WHERE s.clinica_id = public.get_user_clinica_id()
    )
    OR sucursal_id IS NULL
  );

-- ─── 2. Drop legacy 'tasks' table ────────────────────────────
-- Data already migrated to crm_tasks in migration 20260322000002
DROP TABLE IF EXISTS public.tasks CASCADE;

-- ─── 3. Task Sequences (Automation) ──────────────────────────

-- Sequence headers
CREATE TABLE IF NOT EXISTS public.task_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT DEFAULT 'lead_assigned' CHECK (trigger_type IN ('lead_assigned','lead_created','manual')),
  pipeline TEXT DEFAULT 'leads' CHECK (pipeline IN ('leads','deals','all')),
  holidays JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step templates within a sequence
CREATE TABLE IF NOT EXISTS public.task_sequence_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.task_sequences(id) ON DELETE CASCADE,
  step_order INT DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'otro' CHECK (task_type IN ('llamada','mensaje','reunion','cotizacion','otro')),
  delay_days INT DEFAULT 0,   -- Business days from trigger
  delay_hours INT DEFAULT 12, -- Hour UTC for the due_date
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('alta','normal','baja')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for task_sequences (clinic scoped)
ALTER TABLE public.task_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_sequences_clinic_access" ON public.task_sequences
  FOR ALL TO authenticated
  USING (clinica_id = public.get_user_clinica_id())
  WITH CHECK (clinica_id = public.get_user_clinica_id());

-- RLS for task_sequence_steps (via parent sequence)
ALTER TABLE public.task_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_sequence_steps_access" ON public.task_sequence_steps
  FOR ALL TO authenticated
  USING (
    sequence_id IN (
      SELECT id FROM public.task_sequences
      WHERE clinica_id = public.get_user_clinica_id()
    )
  )
  WITH CHECK (
    sequence_id IN (
      SELECT id FROM public.task_sequences
      WHERE clinica_id = public.get_user_clinica_id()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_sequences_active
  ON public.task_sequences(clinica_id, is_active, trigger_type, pipeline);
CREATE INDEX IF NOT EXISTS idx_task_sequence_steps_order
  ON public.task_sequence_steps(sequence_id, step_order);
