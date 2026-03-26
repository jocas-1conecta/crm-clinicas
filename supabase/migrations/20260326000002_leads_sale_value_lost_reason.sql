-- Add sale_value and lost_reason columns to leads table
-- These are used by LeadDetail and UniversalPipelineBoard gatekeeping
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sale_value numeric,
  ADD COLUMN IF NOT EXISTS lost_reason text;
