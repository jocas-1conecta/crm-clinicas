BEGIN;

-- FIX FOR INFINITE RLS RECURSION: get_user_clinica_id()
-- The function get_user_clinica_id() is used in almost every RLS policy (clinicas, leads, patients, etc.)
-- If this function is NOT SECURITY DEFINER, every time it calls "SELECT clinica_id FROM profiles",
-- PostgreSQL applies the RLS policies of the "profiles" table.
-- Since the "profiles" table policy ALSO calls get_user_clinica_id(), it creates an infinite loop
-- and crashes the database query with a 500 error.

-- We redefine it securely:
CREATE OR REPLACE FUNCTION get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- CRITICAL: Bypass RLS inside this function to prevent infinite loops
SET search_path = public
AS $$
    SELECT clinica_id 
    FROM profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
$$;

COMMIT;
