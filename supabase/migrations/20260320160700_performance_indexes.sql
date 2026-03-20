-- Performance indexes for multi-clinic scalability
-- These composite indexes cover the most frequent query patterns.

-- Leads: filter by clinic + status (Kanban board, dashboard KPIs)
CREATE INDEX IF NOT EXISTS idx_leads_clinica_status ON public.leads(clinica_id, status);

-- Leads: filter by clinic + sort by created_at (recent leads list)
CREATE INDEX IF NOT EXISTS idx_leads_clinica_created ON public.leads(clinica_id, created_at DESC);

-- Leads: filter by branch (advisor dashboard)
CREATE INDEX IF NOT EXISTS idx_leads_sucursal_status ON public.leads(sucursal_id, status);

-- Leads: filter by assigned advisor
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to, status);

-- Appointments: filter by branch + status
CREATE INDEX IF NOT EXISTS idx_appointments_sucursal ON public.appointments(sucursal_id, status);

-- Tasks: filter by assigned advisor + date
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_date ON public.tasks(assigned_to, task_date);

-- Tasks: filter by related entity (lead/patient detail view)
CREATE INDEX IF NOT EXISTS idx_tasks_rel ON public.tasks(rel_id);

-- Patients: filter by assigned advisor
CREATE INDEX IF NOT EXISTS idx_patients_assigned ON public.patients(assigned_to);

-- Deals: filter by patient
CREATE INDEX IF NOT EXISTS idx_deals_patient ON public.deals(patient_id);

-- Pipeline stages: filter by clinic + board type
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_clinica ON public.pipeline_stages(clinica_id, board_type);

-- Profiles: filter by clinic (team listing)
CREATE INDEX IF NOT EXISTS idx_profiles_clinica ON public.profiles(clinica_id);
