-- ============================================================
-- SECURITY FIX C-03: Storage — Aislar logos y avatars por tenant/usuario
--
-- PROBLEMA: Las políticas actuales solo verifican bucket_id,
-- permitiendo que CUALQUIER usuario autenticado suba, sobrescriba
-- o elimine archivos de CUALQUIER clínica/usuario.
--
-- RUTAS EXISTENTES (no se modifican en frontend):
--   Logos:   tenant-{clinica_id}-{ts}_thumb.png
--            tenant-{clinica_id}-login-{ts}.png
--            tenant-{clinica_id}-favicon-{ts}.png
--            platform-logo-{ts}.png  (solo Platform Owner)
--   Avatars: avatars/{user_id}-{ts}_thumb.jpg
--
-- SOLUCIÓN: Reemplazar políticas planas por path-based isolation.
--   - SELECT: permanece abierto (buckets públicos, URLs directas)
--   - INSERT/UPDATE/DELETE: solo archivos cuyo path coincida con
--     el tenant_id o user_id del solicitante.
-- ============================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  LOGOS BUCKET                                               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Drop old permissive policies
DROP POLICY IF EXISTS "Logos readable by authenticated users"   ON storage.objects;
DROP POLICY IF EXISTS "Logos uploadable by authenticated users"  ON storage.objects;
DROP POLICY IF EXISTS "Logos updatable by authenticated users"   ON storage.objects;
DROP POLICY IF EXISTS "Logos deletable by authenticated users"   ON storage.objects;

-- SELECT: cualquier autenticado puede leer (bucket público)
CREATE POLICY "logos_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'logos');

-- INSERT: solo archivos con prefijo de tu propia clínica
CREATE POLICY "logos_insert_own_tenant"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND name LIKE 'tenant-' || public.get_user_clinica_id()::text || '-%'
  );

-- UPDATE: solo archivos con prefijo de tu propia clínica
CREATE POLICY "logos_update_own_tenant"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND name LIKE 'tenant-' || public.get_user_clinica_id()::text || '-%'
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND name LIKE 'tenant-' || public.get_user_clinica_id()::text || '-%'
  );

-- DELETE: solo archivos con prefijo de tu propia clínica
CREATE POLICY "logos_delete_own_tenant"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND name LIKE 'tenant-' || public.get_user_clinica_id()::text || '-%'
  );

-- Platform Owner: acceso completo a archivos platform-*
CREATE POLICY "logos_insert_platform_owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND name LIKE 'platform-%'
    AND public.is_platform_owner()
  );

CREATE POLICY "logos_update_platform_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND name LIKE 'platform-%'
    AND public.is_platform_owner()
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND name LIKE 'platform-%'
    AND public.is_platform_owner()
  );

CREATE POLICY "logos_delete_platform_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND name LIKE 'platform-%'
    AND public.is_platform_owner()
  );

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  AVATARS BUCKET                                             ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Drop old permissive policies
DROP POLICY IF EXISTS "Avatars readable by authenticated users"   ON storage.objects;
DROP POLICY IF EXISTS "Avatars uploadable by authenticated users"  ON storage.objects;
DROP POLICY IF EXISTS "Avatars updatable by authenticated users"   ON storage.objects;
DROP POLICY IF EXISTS "Avatars deletable by authenticated users"   ON storage.objects;

-- SELECT: cualquier autenticado puede leer (bucket público)
CREATE POLICY "avatars_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- INSERT: solo con tu propio user_id en el path
CREATE POLICY "avatars_insert_own_user"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'avatars/' || auth.uid()::text || '-%'
  );

-- UPDATE: solo con tu propio user_id en el path
CREATE POLICY "avatars_update_own_user"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'avatars/' || auth.uid()::text || '-%'
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'avatars/' || auth.uid()::text || '-%'
  );

-- DELETE: solo con tu propio user_id en el path
CREATE POLICY "avatars_delete_own_user"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'avatars/' || auth.uid()::text || '-%'
  );

COMMIT;
