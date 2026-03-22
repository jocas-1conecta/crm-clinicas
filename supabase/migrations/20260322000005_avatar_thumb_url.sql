-- ================================================================
-- MIGRATION: Add avatar_thumb_url column to profiles
-- Stores the 128px thumbnail URL separately for performance
-- ================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_thumb_url TEXT;
