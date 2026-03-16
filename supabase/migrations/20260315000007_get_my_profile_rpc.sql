-- FINAL FIX: Create a SECURITY DEFINER function that the frontend can call 
-- to fetch the current user's own profile safely, completely bypassing RLS.
-- This eliminates ALL possibility of RLS recursion during login.

CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(profile_record);
END;
$$;
