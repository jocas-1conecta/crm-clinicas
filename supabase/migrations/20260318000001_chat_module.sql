-- Chat Module: Add Timelines AI API Key to clinicas
-- Each clinic can store its own Timelines AI API key securely.

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS timelines_ai_api_key TEXT;

COMMENT ON COLUMN clinicas.timelines_ai_api_key IS 'Bearer token for Timelines AI API (WhatsApp integration). Stored per clinic.';
