-- Storage bucket for teacher videos and policies so upload + library insert work.
-- Run after other migrations (e.g. supabase db push or Dashboard SQL).

-- 1) Create public bucket "videos" (readable via public URL; upload still needs policy)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Allow authenticated users to upload to "videos"
CREATE POLICY "videos_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Allow public read is implied by bucket public=true; optional explicit SELECT for listing
CREATE POLICY "videos_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- 3) Allow authenticated users to insert/update dance_library (for admin upload flow)
CREATE POLICY "dance_library_insert_authenticated"
ON public.dance_library FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "dance_library_update_authenticated"
ON public.dance_library FOR UPDATE
TO authenticated
USING (true);
