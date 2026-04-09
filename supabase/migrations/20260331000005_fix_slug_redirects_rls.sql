-- ============================================================
-- SECURITY FIX C-05: slug_redirects — Cerrar INSERT abierto
--
-- PROBLEMA: La política INSERT usa WITH CHECK (true), permitiendo
-- que cualquier usuario autenticado inserte redirects falsos.
-- Un atacante podría redirigir el slug de otra clínica a un
-- dominio de phishing o causar loops de redirección.
--
-- SOLUCIÓN:
--   - SELECT: permanece abierto a anon+authenticated (necesario
--     para resolver slugs antes del login).
--   - INSERT: solo Super_Admin de la clínica propietaria.
--   - DELETE: solo Super_Admin (limpieza de redirects obsoletos).
-- ============================================================

BEGIN;

-- 1. Eliminar la política INSERT abierta
DROP POLICY IF EXISTS "slug_redirects_insert_authenticated" ON public.slug_redirects;

-- 2. Solo Super_Admin puede insertar redirects para SU clínica
CREATE POLICY "slug_redirects_insert_super_admin"
  ON public.slug_redirects FOR INSERT
  TO authenticated
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'Super_Admin'
    )
  );

-- 3. Solo Super_Admin puede eliminar redirects de SU clínica
CREATE POLICY "slug_redirects_delete_super_admin"
  ON public.slug_redirects FOR DELETE
  TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'Super_Admin'
    )
  );

-- 4. Platform Owner: gestión total
CREATE POLICY "slug_redirects_platform_owner"
  ON public.slug_redirects FOR ALL
  TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

COMMIT;
