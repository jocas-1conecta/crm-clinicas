-- ==============================================================================
-- MIGRACIÓN FASE 9: B2B Onboarding (Registro de Nueva Empresa)
-- Este archivo contiene la lógica transaccional para crear entornos SaaS multi-tenant
-- ==============================================================================

-- 1. FUNCIÓN LIGERA DE VERIFICACIÓN DE SLUG (Para UI Debounce / React Query)
CREATE OR REPLACE FUNCTION is_slug_available(checked_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Retorna true si NO existe ninguna clínica con este slug
    RETURN NOT EXISTS (SELECT 1 FROM clinicas WHERE slug = checked_slug);
END;
$$;


-- 2. FUNCIÓN TRANSACCIONAL DE CREACIÓN DE TENANT
-- Inserta la clínica, la sucursal matriz y fuerza la actualización del perfil
-- que fue creado milisegundos atrás por el trigger de Supabase Auth.
CREATE OR REPLACE FUNCTION create_new_tenant(
    admin_user_id uuid,
    admin_name text,
    admin_email text,
    tenant_name text,
    tenant_slug text,
    tenant_industry text,
    branch_name text,
    branch_address text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Permite insertar sin trabas iniciales de RLS (SuperAdmin scope momentáneo)
SET search_path = public
AS $$
DECLARE
    v_clinica_id uuid;
    v_sucursal_id uuid;
    v_active_modules jsonb;
    v_result json;
BEGIN
    -- Validar slug único por si dos usuarios intentan registrar al mismo tiempo
    IF EXISTS (SELECT 1 FROM clinicas WHERE slug = tenant_slug) THEN
        RAISE EXCEPTION 'El slug "%" ya está en uso. Por favor elige otro.', tenant_slug;
    END IF;

    -- Determinar módulos activos según el sector elegido en el Wizard
    IF tenant_industry = 'clinic' THEN
        v_active_modules := '["clinic_core"]'::jsonb;
    ELSE
        -- Empresas normales sin acceso a historia clínica ni turnos
        v_active_modules := '[]'::jsonb;
    END IF;

    -- PASO 1. Crear Empresa (Tenant)
    INSERT INTO clinicas (name, slug, active_modules)
    VALUES (tenant_name, tenant_slug, v_active_modules)
    RETURNING id INTO v_clinica_id;

    -- PASO 2. Crear Sucursal Matriz
    INSERT INTO sucursales (clinica_id, name, address)
    VALUES (v_clinica_id, branch_name, branch_address)
    RETURNING id INTO v_sucursal_id;

    -- PASO 3. Actualizar el Perfil del Administrador (Dueño de la cuenta)
    -- NOTA: Asumimos que "auth.signUp" se ejecutó antes en el Frontend. Si tienes
    --       un trigger "handle_new_user", ya creó la fila en 'profiles' con campos nulos.
    --       Si no existe la fila, hacemos un UPSERT.
    INSERT INTO profiles (id, email, name, role, clinica_id, sucursal_id)
    VALUES (admin_user_id, admin_email, admin_name, 'Super_Admin', v_clinica_id, v_sucursal_id)
    ON CONFLICT (id) DO UPDATE SET
        clinica_id = v_clinica_id,
        sucursal_id = v_sucursal_id,
        role = 'Super_Admin',
        name = admin_name;

    -- PASO 4 (Opcional pero Recomendado). Insertar Fases Base del Kanban
    -- Para que el tenant no empiece con el embudo vacío
    INSERT INTO stage_transition_rules (clinica_id, from_stage, to_stage, is_mandatory)
    VALUES 
        (v_clinica_id, 'Nuevo', 'Contactado', false),
        (v_clinica_id, 'Contactado', 'Cita Agendada', false),
        (v_clinica_id, 'Cita Agendada', 'Negociación', false),
        (v_clinica_id, 'Negociación', 'Ganado', false),
        (v_clinica_id, 'Negociación', 'Perdido', false);

    -- Construir respuesta exitosa que el Frontend interpretará
    SELECT json_build_object(
        'success', true,
        'clinica_id', v_clinica_id,
        'sucursal_id', v_sucursal_id,
        'slug', tenant_slug
    ) INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Error de integridad (Ya existe): %', SQLERRM;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error grave al fundar el Tenant SaaS: %', SQLERRM;
END;
$$;
