-- Add login_logo_url column to clinicas table
-- This allows a separate logo for the login page vs internal app
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS login_logo_url TEXT;
