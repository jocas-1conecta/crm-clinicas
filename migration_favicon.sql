-- Add favicon_url column to clinicas table
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS favicon_url TEXT;
