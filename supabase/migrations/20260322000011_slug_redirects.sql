-- Create slug_redirects table to track old slugs for automatic redirects
CREATE TABLE IF NOT EXISTS slug_redirects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    old_slug TEXT NOT NULL,
    new_slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by old_slug
CREATE INDEX IF NOT EXISTS idx_slug_redirects_old_slug ON slug_redirects(old_slug);

-- RLS: allow anyone to read (needed for redirect lookup before auth)
ALTER TABLE slug_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slug_redirects_select_all"
ON slug_redirects FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "slug_redirects_insert_authenticated"
ON slug_redirects FOR INSERT
TO authenticated
WITH CHECK (true);
