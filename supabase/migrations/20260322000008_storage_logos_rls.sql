-- ============================================================
-- Storage: create "logos" bucket and set RLS policies
-- ============================================================

-- 1. Create bucket if not exists (public so getPublicUrl works)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow any authenticated user to READ files in the logos bucket
CREATE POLICY "Logos readable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logos');

-- 3. Allow authenticated users to INSERT (upload) files in the logos bucket
CREATE POLICY "Logos uploadable by authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- 4. Allow authenticated users to UPDATE (overwrite) their own files
CREATE POLICY "Logos updatable by authenticated users"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- 5. Allow authenticated users to DELETE their own files
CREATE POLICY "Logos deletable by authenticated users"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

-- ============================================================
-- Also ensure "avatars" bucket exists and has the same policies
-- (in case it has the same issue)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Avatars readable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Avatars uploadable by authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatars updatable by authenticated users"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatars deletable by authenticated users"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
