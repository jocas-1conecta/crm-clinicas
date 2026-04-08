-- ============================================================
-- FIX: get_my_profile() references non-existent columns
-- 
-- The function was referencing 'phone' and 'timezone' columns
-- that don't exist in the profiles table, causing error 42703:
--   record "profile_record" has no field "phone"
-- This prevented ALL users from logging in.
-- ============================================================

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

    -- Return only the fields that actually exist in the profiles table
    RETURN jsonb_build_object(
        'id', profile_record.id,
        'name', profile_record.name,
        'email', profile_record.email,
        'role', profile_record.role,
        'clinica_id', profile_record.clinica_id,
        'sucursal_id', profile_record.sucursal_id,
        'avatar_url', profile_record.avatar_url,
        'avatar_thumb_url', profile_record.avatar_thumb_url,
        'is_active', profile_record.is_active,
        'created_at', profile_record.created_at
    );
END;
$$;
