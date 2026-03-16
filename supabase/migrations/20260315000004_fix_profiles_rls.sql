BEGIN;

-- FIX FOR INFINITE RLS RECURSION ON PROFILES
-- When profiles try to check their own clinic, they might trigger the clinicas policy,
-- which in turn might trigger the profiles policy, leading to a 500 error stack limit.

-- We rewrite the profiles RLS policies to be non-recursive.

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles from their clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can view all profiles in their clinic" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Platform Owner can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;

-- Create unified secure SELECT policy
CREATE POLICY "Profiles visibility" ON public.profiles
    FOR SELECT
    USING (
        -- 1. I can always see myself
        id = auth.uid() 
        OR 
        -- 2. I am a Platform Owner (using the SECURITY DEFINER function to prevent loop)
        is_platform_owner()
        OR
        -- 3. We are in the same clinic (Warning: relies on external function, but acceptable if we already bypassed Platform Owner)
        (clinica_id IS NOT NULL AND clinica_id = get_user_clinica_id())
    );

-- Create simple INSERT policy (Triggers usually handle this, but for completeness)
CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- Create unified UPDATE policy
CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());

COMMIT;
