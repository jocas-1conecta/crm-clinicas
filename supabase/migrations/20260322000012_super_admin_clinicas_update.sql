-- ================================================================
-- MIGRATION: Allow Super_Admin to update their own clinica
-- Fix: Super_Admin can SELECT their clinica but cannot UPDATE it,
-- so brand color, logo, slug, and other settings fail silently.
-- ================================================================

-- Allow Super_Admin to UPDATE their own clinica
DROP POLICY IF EXISTS "Super admin can update own clinica" ON public.clinicas;
CREATE POLICY "Super admin can update own clinica" ON public.clinicas
    FOR UPDATE
    USING (id = get_user_clinica_id())
    WITH CHECK (id = get_user_clinica_id());
