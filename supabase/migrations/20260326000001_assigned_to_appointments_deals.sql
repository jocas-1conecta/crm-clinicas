-- Add assigned_to column to appointments table for staff assignment
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS phone text;

-- Add assigned_to column to deals table for staff assignment
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);

-- Create indexes for faster filtering by assigned_to
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON public.appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON public.deals(assigned_to);
