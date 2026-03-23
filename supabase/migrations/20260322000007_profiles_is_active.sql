-- Migration: Add is_active column to profiles table
-- This column is referenced by TeamManagement and BranchDetail but was missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
