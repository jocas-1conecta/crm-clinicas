-- ============================================================
-- Migration: Add assigned_to to appointments and deals
-- Required by the new pipeline board assignment feature
-- ============================================================

-- 1. Add assigned_to to appointments
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add assigned_to to deals
ALTER TABLE public.deals
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Add phone to appointments (for patient contact info on cards)
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS phone TEXT;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_assigned ON public.appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON public.deals(assigned_to);
