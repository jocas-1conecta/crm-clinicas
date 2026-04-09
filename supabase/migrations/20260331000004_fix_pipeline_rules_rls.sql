-- ============================================================
-- SECURITY FIX C-04 + C-06: pipeline_history_log & stage_transition_rules
--
-- C-04 PROBLEMA: La política INSERT de pipeline_history_log usa
--   WITH CHECK (true), permitiendo a cualquier usuario inyectar
--   registros falsos de auditoría en cualquier clínica.
--
-- C-04 SOLUCIÓN: Eliminar la política INSERT pública. Los inserts
--   solo ocurren desde el trigger fn_track_stage_change() que ya
--   es SECURITY DEFINER (bypasea RLS). Los usuarios NO necesitan
--   insertar directamente en esta tabla.
--
-- C-06 PROBLEMA: La política "Admins manage own clinic rules"
--   usa FOR ALL sin restricción de rol, permitiendo que cualquier
--   usuario (no solo admins) edite las reglas de transición.
--
-- C-06 SOLUCIÓN: Reemplazar por políticas separadas que validen
--   que el usuario tenga rol Super_Admin o Admin.
-- ============================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  C-04: pipeline_history_log — Cerrar INSERT público         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Eliminar la política INSERT abierta
DROP POLICY IF EXISTS "System can insert history" ON public.pipeline_history_log;

-- No se crea política INSERT de reemplazo porque:
-- 1. Los inserts vienen del trigger fn_track_stage_change() que es SECURITY DEFINER
-- 2. SECURITY DEFINER ya bypasea RLS automáticamente
-- 3. Ningún usuario debería insertar directamente en esta tabla

-- Platform Owner puede ver todo el historial (supervisión)
CREATE POLICY "Platform owner reads all history"
  ON public.pipeline_history_log FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  C-06: stage_transition_rules — Restringir a admins reales  ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Eliminar la política permisiva (FOR ALL sin validación de rol)
DROP POLICY IF EXISTS "Admins manage own clinic rules" ON public.stage_transition_rules;

-- SELECT: cualquier usuario de la clínica puede VER las reglas
-- (ya existe "Users see own clinic rules", no la tocamos)

-- INSERT: solo Super_Admin y Admin pueden crear reglas
CREATE POLICY "Admins insert own clinic rules"
  ON public.stage_transition_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

-- UPDATE: solo Super_Admin y Admin pueden modificar reglas
CREATE POLICY "Admins update own clinic rules"
  ON public.stage_transition_rules FOR UPDATE
  TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  )
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
  );

-- DELETE: solo Super_Admin y Admin pueden eliminar reglas
CREATE POLICY "Admins delete own clinic rules"
  ON public.stage_transition_rules FOR DELETE
  TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Super_Admin', 'Admin_Clinica')
    )
  );

-- Platform Owner: acceso total a reglas de transición
CREATE POLICY "Platform owner manages all rules"
  ON public.stage_transition_rules FOR ALL
  TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

COMMIT;
