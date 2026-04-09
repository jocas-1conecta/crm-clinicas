-- ============================================================
-- SECURITY FIX M-01 + M-03:
--   M-01: get_my_profile() retorna todos los campos
--   M-03: Módulo chatbot usa subconsultas a profiles (recursión RLS)
--
-- M-01 PROBLEMA: to_jsonb(profile_record) serializa TODOS los
-- campos, incluyendo futuros campos sensibles que se añadan.
--
-- M-03 PROBLEMA: Todas las políticas del chatbot usan:
--   clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid())
-- Esto accede directamente a la tabla profiles, que tiene RLS.
-- Si las políticas de profiles dependen de get_user_clinica_id(),
-- se puede crear una cadena de recursión RLS.
-- ============================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  M-01: get_my_profile() — Retornar solo campos necesarios   ║
-- ╚══════════════════════════════════════════════════════════════╝

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

    -- Retornar solo los campos que el frontend necesita
    RETURN jsonb_build_object(
        'id', profile_record.id,
        'name', profile_record.name,
        'email', profile_record.email,
        'phone', profile_record.phone,
        'role', profile_record.role,
        'clinica_id', profile_record.clinica_id,
        'sucursal_id', profile_record.sucursal_id,
        'avatar_url', profile_record.avatar_url,
        'avatar_thumb_url', profile_record.avatar_thumb_url,
        'is_active', profile_record.is_active,
        'timezone', profile_record.timezone,
        'created_at', profile_record.created_at
    );
END;
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  M-03: Chatbot — Estandarizar a get_user_clinica_id()       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─── chatbot_config ──────────────────────────────────────────
DROP POLICY IF EXISTS "chatbot_config_select" ON public.chatbot_config;
CREATE POLICY "chatbot_config_select" ON public.chatbot_config
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_config_insert" ON public.chatbot_config;
CREATE POLICY "chatbot_config_insert" ON public.chatbot_config
  FOR INSERT TO authenticated
  WITH CHECK (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_config_update" ON public.chatbot_config;
CREATE POLICY "chatbot_config_update" ON public.chatbot_config
  FOR UPDATE TO authenticated
  USING (clinica_id = public.get_user_clinica_id())
  WITH CHECK (clinica_id = public.get_user_clinica_id());

-- ─── chatbot_knowledge_base ──────────────────────────────────
DROP POLICY IF EXISTS "chatbot_kb_select" ON public.chatbot_knowledge_base;
CREATE POLICY "chatbot_kb_select" ON public.chatbot_knowledge_base
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_kb_insert" ON public.chatbot_knowledge_base;
CREATE POLICY "chatbot_kb_insert" ON public.chatbot_knowledge_base
  FOR INSERT TO authenticated
  WITH CHECK (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_kb_update" ON public.chatbot_knowledge_base;
CREATE POLICY "chatbot_kb_update" ON public.chatbot_knowledge_base
  FOR UPDATE TO authenticated
  USING (clinica_id = public.get_user_clinica_id())
  WITH CHECK (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_kb_delete" ON public.chatbot_knowledge_base;
CREATE POLICY "chatbot_kb_delete" ON public.chatbot_knowledge_base
  FOR DELETE TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

-- ─── chatbot_branch_info ─────────────────────────────────────
DROP POLICY IF EXISTS "chatbot_branch_select" ON public.chatbot_branch_info;
CREATE POLICY "chatbot_branch_select" ON public.chatbot_branch_info
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_branch_insert" ON public.chatbot_branch_info;
CREATE POLICY "chatbot_branch_insert" ON public.chatbot_branch_info
  FOR INSERT TO authenticated
  WITH CHECK (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_branch_update" ON public.chatbot_branch_info;
CREATE POLICY "chatbot_branch_update" ON public.chatbot_branch_info
  FOR UPDATE TO authenticated
  USING (clinica_id = public.get_user_clinica_id())
  WITH CHECK (clinica_id = public.get_user_clinica_id());

-- ─── chatbot_conversations ───────────────────────────────────
DROP POLICY IF EXISTS "chatbot_conv_select" ON public.chatbot_conversations;
CREATE POLICY "chatbot_conv_select" ON public.chatbot_conversations
  FOR SELECT TO authenticated
  USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "chatbot_conv_insert" ON public.chatbot_conversations;
CREATE POLICY "chatbot_conv_insert" ON public.chatbot_conversations
  FOR INSERT TO authenticated
  WITH CHECK (clinica_id = public.get_user_clinica_id());

-- ─── chatbot_messages (via conversation join) ────────────────
DROP POLICY IF EXISTS "chatbot_msg_select" ON public.chatbot_messages;
CREATE POLICY "chatbot_msg_select" ON public.chatbot_messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT id FROM public.chatbot_conversations
    WHERE clinica_id = public.get_user_clinica_id()
  ));

DROP POLICY IF EXISTS "chatbot_msg_insert" ON public.chatbot_messages;
CREATE POLICY "chatbot_msg_insert" ON public.chatbot_messages
  FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.chatbot_conversations
    WHERE clinica_id = public.get_user_clinica_id()
  ));

-- ─── service_knowledge (si existe) ──────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'service_knowledge') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_knowledge_select" ON public.service_knowledge';
    EXECUTE 'CREATE POLICY "service_knowledge_select" ON public.service_knowledge
      FOR SELECT TO authenticated
      USING (clinica_id = public.get_user_clinica_id())';

    EXECUTE 'DROP POLICY IF EXISTS "service_knowledge_insert" ON public.service_knowledge';
    EXECUTE 'CREATE POLICY "service_knowledge_insert" ON public.service_knowledge
      FOR INSERT TO authenticated
      WITH CHECK (clinica_id = public.get_user_clinica_id())';

    EXECUTE 'DROP POLICY IF EXISTS "service_knowledge_update" ON public.service_knowledge';
    EXECUTE 'CREATE POLICY "service_knowledge_update" ON public.service_knowledge
      FOR UPDATE TO authenticated
      USING (clinica_id = public.get_user_clinica_id())
      WITH CHECK (clinica_id = public.get_user_clinica_id())';

    EXECUTE 'DROP POLICY IF EXISTS "service_knowledge_delete" ON public.service_knowledge';
    EXECUTE 'CREATE POLICY "service_knowledge_delete" ON public.service_knowledge
      FOR DELETE TO authenticated
      USING (clinica_id = public.get_user_clinica_id())';
  END IF;
END $$;

COMMIT;
