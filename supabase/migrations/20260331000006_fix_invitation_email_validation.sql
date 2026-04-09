-- ============================================================
-- SECURITY FIX H-01: accept_team_invitation — Validar email
--
-- PROBLEMA: La función accept_team_invitation() no verifica que
-- el email del usuario autenticado coincida con el email de la
-- invitación. Cualquier usuario que conozca un token UUID puede:
--   1. Aceptar invitaciones destinadas a otra persona
--   2. Obtener el rol asignado (incluso Super_Admin)
--   3. Acceder a una clínica a la que no fue invitado
--
-- SOLUCIÓN: Activar la validación de email que estaba comentada,
-- y agregar SET search_path = public en ambas funciones SECURITY
-- DEFINER (hallazgo de seguridad adicional).
-- ============================================================

BEGIN;

-- 1. Corregir verify_team_invitation (agregar search_path)
CREATE OR REPLACE FUNCTION verify_team_invitation(invitation_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inv_record RECORD;
BEGIN
    SELECT * INTO inv_record 
    FROM public.team_invitations 
    WHERE token = invitation_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitación no encontrada o token inválido.';
    END IF;

    IF inv_record.used = true THEN
        RAISE EXCEPTION 'Esta invitación ya fue utilizada.';
    END IF;

    IF inv_record.expires_at < now() THEN
        RAISE EXCEPTION 'Esta invitación ha expirado.';
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'email', inv_record.email,
        'name', inv_record.name
    );
END;
$$;

-- 2. Corregir accept_team_invitation (validar email + search_path)
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inv_record RECORD;
    target_user_id UUID;
    user_email TEXT;
BEGIN
    target_user_id := auth.uid();
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    -- Fetch the invitation
    SELECT * INTO inv_record 
    FROM public.team_invitations 
    WHERE token = invitation_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitación no encontrada o token inválido.';
    END IF;

    IF inv_record.used = true THEN
        RAISE EXCEPTION 'Esta invitación ya fue utilizada.';
    END IF;

    IF inv_record.expires_at < now() THEN
        RAISE EXCEPTION 'Esta invitación ha expirado.';
    END IF;

    -- ═══ FIX H-01: Validar que el email coincida ═══
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = target_user_id;

    IF lower(user_email) != lower(inv_record.email) THEN
        RAISE EXCEPTION 'El correo registrado (%) no coincide con el de la invitación (%). Debes registrarte con el email correcto.', 
            user_email, inv_record.email;
    END IF;
    -- ═══════════════════════════════════════════════

    -- 1. Update Profile (Assign clinica, sucursal, role)
    UPDATE public.profiles
    SET 
        name = inv_record.name,
        clinica_id = inv_record.clinica_id,
        sucursal_id = inv_record.sucursal_id,
        role = inv_record.role,
        is_active = true
    WHERE id = target_user_id;

    -- 2. Mark invitation as used
    UPDATE public.team_invitations
    SET used = true
    WHERE id = inv_record.id;

    RETURN jsonb_build_object(
        'success', true, 
        'clinica_id', inv_record.clinica_id, 
        'role', inv_record.role
    );
END;
$$;

COMMIT;
