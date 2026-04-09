-- ============================================================
-- SECURITY FIX H-03 + H-04: API Keys — Cifrar en reposo
--
-- PROBLEMA: timelines_ai_api_key y gemini_api_key se almacenan
-- en TEXT plano. Si la BD es comprometida (backup leak, SQL
-- injection), todas las API keys de todos los tenants quedan
-- expuestas inmediatamente.
--
-- SOLUCIÓN: Usar pgcrypto para cifrado simétrico AES-256.
--   - Las keys se almacenan cifradas en columnas BYTEA
--   - Se leen/escriben solo vía funciones SECURITY DEFINER
--   - La clave de cifrado vive en un Supabase Secret (app setting)
--   - El frontend NUNCA ve la key raw, solo un indicador masked
--
-- PRE-REQUISITO: Configurar en Supabase Dashboard → Settings →
--   Config → Database Settings → Add Parameter:
--   app.settings.encryption_key = '<tu-clave-secreta-32-chars>'
--
-- O ejecutar como superuser:
--   ALTER DATABASE postgres SET app.settings.encryption_key = '<clave>';
-- ============================================================

BEGIN;

-- 1. Asegurar que pgcrypto esté disponible
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  H-03: timelines_ai_api_key — Cifrar                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Columna cifrada (si ya existe, no se recrea)
ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS timelines_ai_api_key_enc BYTEA;

-- Función para GUARDAR la API key (cifra antes de escribir)
CREATE OR REPLACE FUNCTION public.set_timelines_api_key(p_key TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID;
    v_enc_key TEXT;
BEGIN
    v_clinica_id := get_user_clinica_id();
    IF v_clinica_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró clínica para el usuario actual.';
    END IF;

    -- Validar que el usuario sea admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('Super_Admin', 'Admin_Clinica')
    ) THEN
        RAISE EXCEPTION 'Solo administradores pueden configurar API keys.';
    END IF;

    v_enc_key := current_setting('app.settings.encryption_key', true);
    IF v_enc_key IS NULL OR v_enc_key = '' THEN
        RAISE EXCEPTION 'Encryption key no configurada. Contacta al administrador del sistema.';
    END IF;

    IF p_key IS NULL OR p_key = '' THEN
        -- Borrar la key
        UPDATE clinicas
        SET timelines_ai_api_key = NULL,
            timelines_ai_api_key_enc = NULL
        WHERE id = v_clinica_id;
    ELSE
        -- Cifrar y guardar
        UPDATE clinicas
        SET timelines_ai_api_key_enc = pgp_sym_encrypt(p_key, v_enc_key),
            timelines_ai_api_key = '***ENCRYPTED***'  -- marker para backward compat
        WHERE id = v_clinica_id;
    END IF;
END;
$$;

-- Función para LEER la API key (descifra al leer)
CREATE OR REPLACE FUNCTION public.get_timelines_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID;
    v_enc_key TEXT;
    v_encrypted BYTEA;
BEGIN
    v_clinica_id := get_user_clinica_id();
    IF v_clinica_id IS NULL THEN
        RETURN NULL;
    END IF;

    v_enc_key := current_setting('app.settings.encryption_key', true);
    IF v_enc_key IS NULL OR v_enc_key = '' THEN
        -- Fallback: retornar la key en texto plano si existe
        -- (backward compat durante la transición)
        RETURN (SELECT timelines_ai_api_key FROM clinicas WHERE id = v_clinica_id);
    END IF;

    SELECT timelines_ai_api_key_enc INTO v_encrypted
    FROM clinicas WHERE id = v_clinica_id;

    IF v_encrypted IS NULL THEN
        -- Puede que aún no se haya migrado, retornar texto plano
        RETURN (SELECT timelines_ai_api_key FROM clinicas WHERE id = v_clinica_id);
    END IF;

    RETURN pgp_sym_decrypt(v_encrypted, v_enc_key);
END;
$$;

-- Función para saber si hay key configurada (sin exponer el valor)
CREATE OR REPLACE FUNCTION public.has_timelines_api_key()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM clinicas
        WHERE id = get_user_clinica_id()
        AND (timelines_ai_api_key_enc IS NOT NULL
             OR (timelines_ai_api_key IS NOT NULL
                 AND timelines_ai_api_key != '***ENCRYPTED***'))
    );
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  H-04: gemini_api_key — Cifrar                             ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE public.chatbot_config
  ADD COLUMN IF NOT EXISTS gemini_api_key_enc BYTEA;

CREATE OR REPLACE FUNCTION public.set_gemini_api_key(p_key TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID;
    v_enc_key TEXT;
BEGIN
    v_clinica_id := get_user_clinica_id();
    IF v_clinica_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró clínica para el usuario actual.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('Super_Admin', 'Admin_Clinica')
    ) THEN
        RAISE EXCEPTION 'Solo administradores pueden configurar API keys.';
    END IF;

    v_enc_key := current_setting('app.settings.encryption_key', true);
    IF v_enc_key IS NULL OR v_enc_key = '' THEN
        RAISE EXCEPTION 'Encryption key no configurada. Contacta al administrador del sistema.';
    END IF;

    IF p_key IS NULL OR p_key = '' THEN
        UPDATE chatbot_config
        SET gemini_api_key = NULL,
            gemini_api_key_enc = NULL
        WHERE clinica_id = v_clinica_id;
    ELSE
        UPDATE chatbot_config
        SET gemini_api_key_enc = pgp_sym_encrypt(p_key, v_enc_key),
            gemini_api_key = '***ENCRYPTED***'
        WHERE clinica_id = v_clinica_id;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_gemini_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID;
    v_enc_key TEXT;
    v_encrypted BYTEA;
BEGIN
    v_clinica_id := get_user_clinica_id();
    IF v_clinica_id IS NULL THEN
        RETURN NULL;
    END IF;

    v_enc_key := current_setting('app.settings.encryption_key', true);
    IF v_enc_key IS NULL OR v_enc_key = '' THEN
        RETURN (SELECT gemini_api_key FROM chatbot_config WHERE clinica_id = v_clinica_id);
    END IF;

    SELECT gemini_api_key_enc INTO v_encrypted
    FROM chatbot_config WHERE clinica_id = v_clinica_id;

    IF v_encrypted IS NULL THEN
        RETURN (SELECT gemini_api_key FROM chatbot_config WHERE clinica_id = v_clinica_id);
    END IF;

    RETURN pgp_sym_decrypt(v_encrypted, v_enc_key);
END;
$$;

COMMIT;
