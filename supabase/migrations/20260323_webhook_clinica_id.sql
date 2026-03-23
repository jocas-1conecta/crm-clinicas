-- Migration: Add clinica_id to chat_webhook_events for tenant isolation
-- This enables the webhook to associate events with specific clinics

ALTER TABLE public.chat_webhook_events
  ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_clinica
  ON public.chat_webhook_events(clinica_id);
