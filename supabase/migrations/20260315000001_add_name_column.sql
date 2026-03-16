BEGIN;

-- Add 'name' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'team_invitations'
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.team_invitations ADD COLUMN name TEXT NOT NULL DEFAULT 'Usuario';
    END IF;
END $$;

COMMIT;
