-- ============================================================
-- SECURITY FIX C-02: chat_webhook_events — Aislar por tenant
--
-- PROBLEMA: La política actual `USING (true)` permite que
-- cualquier usuario autenticado lea TODOS los eventos webhook
-- de TODAS las clínicas, exponiendo nombres, teléfonos y
-- contenido de mensajes de WhatsApp de pacientes ajenos.
--
-- SOLUCIÓN: Reemplazar la política abierta por una que filtre
-- usando la columna clinica_id (añadida en migración 20260323).
-- ============================================================

BEGIN;

-- 1. Eliminar la política abierta
DROP POLICY IF EXISTS "authenticated can read" ON public.chat_webhook_events;

-- 2. Usuarios solo ven webhooks de su propia clínica
CREATE POLICY "Users read own clinic webhook events"
  ON public.chat_webhook_events
  FOR SELECT
  TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

-- 3. Platform Owner puede ver todos (supervisión)
CREATE POLICY "Platform owner reads all webhook events"
  ON public.chat_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());

COMMIT;
