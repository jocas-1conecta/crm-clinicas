-- ================================================================
-- MIGRATION: Platform Owner full access to clinicas + sucursales
-- Fix: PO could SELECT clinicas but not UPDATE or INSERT them
-- ================================================================

-- 1. Allow Platform Owner to INSERT new clinicas
DROP POLICY IF EXISTS "Platform owner can create clinicas" ON public.clinicas;
CREATE POLICY "Platform owner can create clinicas" ON public.clinicas
    FOR INSERT
    WITH CHECK (is_platform_owner());

-- 2. Allow Platform Owner to UPDATE any clinica
DROP POLICY IF EXISTS "Platform owner can update clinicas" ON public.clinicas;
CREATE POLICY "Platform owner can update clinicas" ON public.clinicas
    FOR UPDATE
    USING (is_platform_owner())
    WITH CHECK (is_platform_owner());

-- 3. Allow Platform Owner to INSERT sucursales (for auto-creating "Matriz Principal")
DROP POLICY IF EXISTS "Platform owner can create sucursales" ON public.sucursales;
CREATE POLICY "Platform owner can create sucursales" ON public.sucursales
    FOR INSERT
    WITH CHECK (is_platform_owner());

-- 4. Allow Platform Owner to SELECT sucursales (needed for validation)
DROP POLICY IF EXISTS "Platform owner can view sucursales" ON public.sucursales;
CREATE POLICY "Platform owner can view sucursales" ON public.sucursales
    FOR SELECT
    USING (is_platform_owner());
