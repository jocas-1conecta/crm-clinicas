-- Chat Templates table for managing WhatsApp quick-reply templates
CREATE TABLE IF NOT EXISTS public.chat_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    media_url TEXT DEFAULT NULL,
    media_type TEXT DEFAULT NULL, -- 'image', 'video', 'audio', 'document'
    variables JSONB DEFAULT '[]'::jsonb, -- [{ key: "nombre", label: "Nombre del paciente" }]
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by clinic
CREATE INDEX IF NOT EXISTS idx_chat_templates_clinica ON public.chat_templates(clinica_id);

-- RLS
ALTER TABLE public.chat_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users in the same clinic can read templates
CREATE POLICY "Users can read own clinic templates"
    ON public.chat_templates FOR SELECT
    USING (
        clinica_id IN (
            SELECT clinica_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Only admins can manage templates
CREATE POLICY "Admins can insert templates"
    ON public.chat_templates FOR INSERT
    WITH CHECK (
        clinica_id IN (
            SELECT u.clinica_id FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('Super_Admin', 'Admin_Clinica')
        )
    );

CREATE POLICY "Admins can update templates"
    ON public.chat_templates FOR UPDATE
    USING (
        clinica_id IN (
            SELECT u.clinica_id FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('Super_Admin', 'Admin_Clinica')
        )
    );

CREATE POLICY "Admins can delete templates"
    ON public.chat_templates FOR DELETE
    USING (
        clinica_id IN (
            SELECT u.clinica_id FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('Super_Admin', 'Admin_Clinica')
        )
    );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_chat_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_templates_updated_at
    BEFORE UPDATE ON public.chat_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_templates_updated_at();
