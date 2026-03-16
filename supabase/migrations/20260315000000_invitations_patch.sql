-- ==========================================
-- PHASE 11: TEAM INVITATIONS (TOKEN LINKS)
-- ==========================================

BEGIN;

-- 1. Create Team Invitations Table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'Asesor_Sucursal'::user_role,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    used BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '7 days') NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Invitations
-- Clinic Admins/Super Admins can see their own clinic's invitations
DROP POLICY IF EXISTS "Admins can view clinic invitations" ON public.team_invitations;
CREATE POLICY "Admins can view clinic invitations" ON public.team_invitations
    FOR SELECT
    USING (
        clinica_id = get_user_clinica_id() 
        AND (
            auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Super_Admin', 'Admin_Clinica', 'Platform_Owner'))
        )
    );

-- Clinic Admins/Super Admins can create invitations for their clinic
DROP POLICY IF EXISTS "Admins can create clinic invitations" ON public.team_invitations;
CREATE POLICY "Admins can create clinic invitations" ON public.team_invitations
    FOR INSERT
    WITH CHECK (
        clinica_id = get_user_clinica_id() 
        AND (
            auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Super_Admin', 'Admin_Clinica', 'Platform_Owner'))
        )
    );

-- ANYONE can read an invitation IF they have the exact token (needed for the /join public page)
-- WARNING: We removed the direct SELECT policy because USING(true) exposes all rows.
-- Instead, we will use a SECURITY DEFINER RPC to verify tokens.
DROP POLICY IF EXISTS "Public can read by token" ON public.team_invitations;

-- 4. RPC Function to Verify Invitation Token
CREATE OR REPLACE FUNCTION verify_team_invitation(invitation_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 4. RPC Function to Accept Invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Needs to bypass RLS to update the profile and mark token as used
AS $$
DECLARE
    inv_record RECORD;
    target_user_id UUID;
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

    -- Note: We are not enforcing that the registered email matches the invitation email strictly,
    -- to allow users to use a different email if they prefer, BUT you could enforce it here:
    -- IF (SELECT email FROM auth.users WHERE id = target_user_id) != inv_record.email THEN
    --    RAISE EXCEPTION 'El correo registrado no coincide con el de la invitación.';
    -- END IF;

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
