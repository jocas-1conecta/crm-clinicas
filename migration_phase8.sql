-- Migración Fase 8: Identifier-First Auth Flow
-- Esta función RPC permite buscar el slug de una clínica basado en el correo del usuario SIN saltarse el RLS desde el cliente.
-- Al ser SECURITY DEFINER, se ejecuta con privilegios de administrador para cruzar la tabla de perfiles y limitarse a devolver un string (slug) o nulo.

CREATE OR REPLACE FUNCTION get_tenant_slug_by_email(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Fundamental: Salta el RLS para poder buscar el correo antes de que el usuario inicie sesión.
SET search_path = public -- Buena práctica de seguridad
AS $$
DECLARE
    found_slug text;
BEGIN
    SELECT c.slug INTO found_slug
    FROM profiles p
    JOIN clinicas c ON c.id = p.clinica_id
    WHERE p.email = user_email
    LIMIT 1;
    
    RETURN found_slug;
END;
$$;
