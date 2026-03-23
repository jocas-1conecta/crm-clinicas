-- Add logo_url column to clinicas table
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS logo_url TEXT;
