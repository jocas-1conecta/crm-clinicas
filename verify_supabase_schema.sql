-- =========================================================================
-- SCRIPT DE AUDITORÍA Y VERIFICACIÓN SAAS (SUPABASE)
-- Este script NO destruye datos. Solo revisa que todas las piezas
-- arquitectónicas del sistema SaaS estén configuradas correctamente.
-- =========================================================================

-- 1. VERIFICAR QUE EXISTAN TODAS LAS TABLAS DEL CORE
DO $$ 
DECLARE
    t_name text;
    required_tables text[] := ARRAY[
        'clinicas', 'sucursales', 'profiles', 'patients', 'leads', 'deals', 'tasks', 'stage_transition_rules'
    ];
    missing_tables text[] := ARRAY[]::text[];
BEGIN
    FOREACH t_name IN ARRAY required_tables LOOP
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            missing_tables := array_append(missing_tables, t_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '⚠️ FALTAN TABLAS CRÍTICAS: %', missing_tables;
    ELSE
        RAISE NOTICE '✅ Todas las tablas core existen.';
    END IF;
END $$;


-- 2. VERIFICAR LA COLUMNA ACTIVE_MODULES EN CLINICAS (SaaS Feature Flags)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clinicas' AND column_name = 'active_modules'
    ) THEN
        RAISE NOTICE '✅ Feature Flags SaaS habilitados (columna active_modules existe).';
    ELSE
        RAISE WARNING '⚠️ FALTA COLUMNA "active_modules" EN LA TABLA "clinicas". Ejecutar: ALTER TABLE clinicas ADD COLUMN active_modules JSONB DEFAULT ''[]''::jsonb;';
    END IF;
END $$;


-- 3. VERIFICAR FUNCIONES Y TRIGGERS CLAVE
DO $$
BEGIN
    -- Verificando el RPC de Home Realm Discovery
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tenant_slug_by_email') THEN
        RAISE NOTICE '✅ RPC: "get_tenant_slug_by_email" existe (Identifier-First Auth soportado).';
    ELSE
        RAISE WARNING '⚠️ FALTA RPC: "get_tenant_slug_by_email". Ejecuta el archivo migration_phase8.sql';
    END IF;

    -- Verificando Trigger de validación de Fases/Kanban (Opcional pero recomendado)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
         RAISE NOTICE '✅ Trigger de creación de perfiles Automático (handle_new_user) está instalado.';
    END IF;
END $$;


-- 4. VERIFICAR ESTADO DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Muesta qué tablas NO tienen RLS habilitado (Alerta Grave en Arquitectura Multitenant)
SELECT 
    relname as table_name,
    CASE WHEN relrowsecurity THEN '✅ RLS ENABLED' ELSE '❌ INSEGURO: RLS APAGADO' END as rls_status
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND relkind = 'r'
AND relname IN ('patients', 'leads', 'deals', 'clinicas', 'profiles', 'sucursales');


-- 5. AUDITORÍA DE POLÍTICAS DEL SISTEMA TENANT
-- Enlista todas las reglas RLS actuales en las tablas críticas para verificar su estanqueidad.
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as definition
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('patients', 'leads', 'deals', 'profiles')
ORDER BY tablename;

-- =========================================================================
-- RESUMEN BÁSICO: 
-- 1. Si el "rls_status" dice "INSEGURO", un usuario de la Sucursal A podría ver la Sucursal B hackeando el frontend.
-- 2. "active_modules" debe ser JSONB para que la interfaz de /pacientes o /citas en el Frontend se habilite o bloquee dinámicamente.
-- 3. El RPC get_tenant_slug_by_email debe existir para que la pantalla del `/login` neutra logre redireccionar al empleado a su workspace.
