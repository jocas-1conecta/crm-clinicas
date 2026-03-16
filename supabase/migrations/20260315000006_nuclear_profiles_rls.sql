-- NUCLEAR FIX: Drop ALL policies on profiles dynamically
-- This ensures no leftover recursive policy from the original Supabase setup survives.

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END;
$$;

-- Rebuild with CLEAN, NON-RECURSIVE policies

-- 1. Every user can see ONLY their own profile (pure comparison, zero DB queries)
CREATE POLICY "own_profile_select" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- 2. Platform Owner can see all profiles (uses SECURITY DEFINER function, no recursion)
CREATE POLICY "platform_owner_select_all" ON public.profiles
    FOR SELECT
    USING (is_platform_owner());

-- 3. Clinic members can see others in their same clinic (uses SECURITY DEFINER, no recursion)
CREATE POLICY "same_clinic_select" ON public.profiles
    FOR SELECT
    USING (
        clinica_id IS NOT NULL
        AND clinica_id = get_user_clinica_id()
    );

-- 4. Users can insert their own profile (for signup trigger)
CREATE POLICY "own_profile_insert" ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- 5. Users can update their own profile
CREATE POLICY "own_profile_update" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());
