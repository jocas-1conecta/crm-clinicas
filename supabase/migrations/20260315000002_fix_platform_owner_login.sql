BEGIN;

-- Update the get_tenant_slug_by_email RPC to support Platform_Owner
-- Platform_Owner doesn't belong to a specific clinic, so we'll return a special 'system' slug
CREATE OR REPLACE FUNCTION get_tenant_slug_by_email(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_slug text;
    user_role user_role;
BEGIN
    -- First, check if the user is a Platform_Owner
    SELECT role INTO user_role 
    FROM profiles 
    WHERE email = user_email 
    LIMIT 1;

    IF user_role = 'Platform_Owner' THEN
        RETURN 'system';
    END IF;

    -- Otherwise, proceed with the normal join
    SELECT c.slug INTO found_slug
    FROM profiles p
    JOIN clinicas c ON c.id = p.clinica_id
    WHERE p.email = user_email
    LIMIT 1;
    
    RETURN found_slug;
END;
$$;

COMMIT;
