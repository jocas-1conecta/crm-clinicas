BEGIN;

-- 1. Create a SECURITY DEFINER function to check for Platform Owner
-- This bypasses RLS on the profiles table, preventing infinite recursion
-- when the clinicas policy tries to read from the profiles table.
CREATE OR REPLACE FUNCTION is_platform_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'Platform_Owner'
    );
$$;

-- 2. Update the clinicas visibility policy to use the secure function
DROP POLICY IF EXISTS "Clinicas visibility" ON public.clinicas;
CREATE POLICY "Clinicas visibility" ON public.clinicas
    FOR SELECT
    USING (
       is_platform_owner() 
       OR 
       (id = get_user_clinica_id())
    );

COMMIT;
