-- Add logo optimization columns to clinicas
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS logo_thumb_url TEXT;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS logo_display_mode TEXT DEFAULT 'logo_text';
