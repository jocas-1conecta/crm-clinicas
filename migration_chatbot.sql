-- ============================================================
-- Chatbot AI Module — Migration
-- ============================================================

-- 1. Configuración y personalidad del bot por clínica
CREATE TABLE IF NOT EXISTS chatbot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    bot_name TEXT NOT NULL DEFAULT 'Asistente AI',
    personality_prompt TEXT NOT NULL DEFAULT 'Eres un asistente de atención al cliente amable, profesional y empático para una clínica médica. Responde de forma clara y concisa. Siempre mantén un tono cálido y servicial.',
    greeting_message TEXT NOT NULL DEFAULT '¡Hola! 👋 Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?',
    fallback_message TEXT NOT NULL DEFAULT 'Disculpa, no tengo información suficiente para responder eso. Te recomiendo contactar directamente a nuestro equipo para una atención más personalizada.',
    gemini_api_key TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(clinica_id)
);

-- 2. Base de conocimiento seccionada
CREATE TABLE IF NOT EXISTS chatbot_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    section TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Información dinámica por sucursal
CREATE TABLE IF NOT EXISTS chatbot_branch_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    opening_hours TEXT,
    extra_info JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(sucursal_id)
);

-- 4. Conversaciones de prueba
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    started_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Mensajes
CREATE TABLE IF NOT EXISTS chatbot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chatbot_kb_clinica ON chatbot_knowledge_base(clinica_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_branch_info_clinica ON chatbot_branch_info(clinica_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_clinica ON chatbot_conversations(clinica_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation ON chatbot_messages(conversation_id);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE chatbot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_branch_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

-- chatbot_config: users can read/write their own clinic's config
CREATE POLICY chatbot_config_select ON chatbot_config FOR SELECT
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_config_insert ON chatbot_config FOR INSERT
    WITH CHECK (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_config_update ON chatbot_config FOR UPDATE
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));

-- chatbot_knowledge_base
CREATE POLICY chatbot_kb_select ON chatbot_knowledge_base FOR SELECT
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_kb_insert ON chatbot_knowledge_base FOR INSERT
    WITH CHECK (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_kb_update ON chatbot_knowledge_base FOR UPDATE
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_kb_delete ON chatbot_knowledge_base FOR DELETE
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));

-- chatbot_branch_info
CREATE POLICY chatbot_branch_select ON chatbot_branch_info FOR SELECT
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_branch_insert ON chatbot_branch_info FOR INSERT
    WITH CHECK (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_branch_update ON chatbot_branch_info FOR UPDATE
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));

-- chatbot_conversations
CREATE POLICY chatbot_conv_select ON chatbot_conversations FOR SELECT
    USING (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY chatbot_conv_insert ON chatbot_conversations FOR INSERT
    WITH CHECK (clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid()));

-- chatbot_messages (via conversation)
CREATE POLICY chatbot_msg_select ON chatbot_messages FOR SELECT
    USING (conversation_id IN (
        SELECT id FROM chatbot_conversations
        WHERE clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid())
    ));
CREATE POLICY chatbot_msg_insert ON chatbot_messages FOR INSERT
    WITH CHECK (conversation_id IN (
        SELECT id FROM chatbot_conversations
        WHERE clinica_id IN (SELECT clinica_id FROM profiles WHERE id = auth.uid())
    ));
