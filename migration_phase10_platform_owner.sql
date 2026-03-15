-- ==========================================
-- PHASE 10: PLATFORM OWNER GLOBAL ROLE
-- ==========================================
-- Descripción:
-- Introduce el rol supremo 'Platform_Owner' destinado exclusivamente 
-- al creador de la plataforma SaaS (José Castañeda).
-- Aisla a los 'Super_Admin' para que operen estrictamente como 
-- administradores supremos de sus respectivos Tenants (Clínicas).

BEGIN;

-- 1. Añadir el nuevo string al ENUM de roles
-- NOTA: PostgreSQL no permite ADD VALUE dentro de bloques transaccionales en algunas versiones.
-- Si esto falla al pegar, ejecuta la línea 13 separadamente primero, y luego el resto.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Platform_Owner';

-- 2. Función de Ayuda: Asignar al dueño (Para que la uses en tu panel SQL)
-- Uso: SELECT set_platform_owner('jose.castaneda@1conecta.com');
CREATE OR REPLACE FUNCTION set_platform_owner(target_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        role = 'Platform_Owner'::user_role,
        clinica_id = NULL,
        sucursal_id = NULL
    WHERE email = target_email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario con correo % no encontrado en la tabla perfiles.', target_email;
    END IF;
END;
$$;

-- 3. Actualizar políticas RLS Críticas para contemplar Platform_Owner (Modo Omnipresente)
-- (Opcional, pero recomendado si quieres que el Platform Owner pueda ver TODA la data cruzada 
-- en la base de datos a futuro desde herramientas internas)

-- Ejemplo para la tabla clinicas: El Platform owner ve todo, el Super Admin ve la suya.
DROP POLICY IF EXISTS "Clinicas visibility" ON public.clinicas;
CREATE POLICY "Clinicas visibility" ON public.clinicas
    FOR SELECT
    USING (
       (auth.uid() IN (SELECT id FROM profiles WHERE role = 'Platform_Owner')) 
       OR 
       (id = get_user_clinica_id())
    );

COMMIT;
