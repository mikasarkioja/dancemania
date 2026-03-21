-- Teacher Studio: processing / pending_admin_approval, private uploads, description, storage path for signed URLs.

-- ---------------------------------------------------------------------------
-- 1) dance_library statuses
-- ---------------------------------------------------------------------------
ALTER TABLE public.dance_library
  DROP CONSTRAINT IF EXISTS dance_library_status_check;

ALTER TABLE public.dance_library
  ADD CONSTRAINT dance_library_status_check
  CHECK (
    status IN (
      'draft',
      'published',
      'needs_relabeling',
      'pending_analysis',
      'processing',
      'needs_labeling',
      'pending_admin_approval'
    )
  );

COMMENT ON COLUMN public.dance_library.status IS
  'draft | published | needs_relabeling | pending_analysis | processing (teacher extraction) | needs_labeling | pending_admin_approval (awaiting gold-standard admin)';

-- ---------------------------------------------------------------------------
-- 2) Optional description + private storage reference (video_url may be null when path is set)
-- ---------------------------------------------------------------------------
ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS source_bucket text;

ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS storage_object_path text;

COMMENT ON COLUMN public.dance_library.description IS 'Teacher-facing notes / move description (optional).';
COMMENT ON COLUMN public.dance_library.source_bucket IS 'Supabase Storage bucket when file is not public URL (e.g. teacher-uploads).';
COMMENT ON COLUMN public.dance_library.storage_object_path IS 'Object path within source_bucket; playback/extraction use signed URLs.';

ALTER TABLE public.dance_library
  DROP CONSTRAINT IF EXISTS dance_library_video_or_storage_check;

ALTER TABLE public.dance_library
  ALTER COLUMN video_url DROP NOT NULL;

ALTER TABLE public.dance_library
  ADD CONSTRAINT dance_library_video_or_storage_check
  CHECK (
    (
      video_url IS NOT NULL
      AND btrim(video_url) <> ''
    )
    OR (
      storage_object_path IS NOT NULL
      AND btrim(storage_object_path) <> ''
      AND source_bucket IS NOT NULL
      AND btrim(source_bucket) <> ''
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Private bucket teacher-uploads (signed URL access from app + service role)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-uploads', 'teacher-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "teacher_uploads_insert_own" ON storage.objects;
CREATE POLICY "teacher_uploads_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "teacher_uploads_select_own" ON storage.objects;
CREATE POLICY "teacher_uploads_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'teacher-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "teacher_uploads_update_own" ON storage.objects;
CREATE POLICY "teacher_uploads_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'teacher-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'teacher-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "teacher_uploads_delete_own" ON storage.objects;
CREATE POLICY "teacher_uploads_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'teacher-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Admins can read any object (gold-standard review / labeling).
DROP POLICY IF EXISTS "teacher_uploads_select_admin" ON storage.objects;
CREATE POLICY "teacher_uploads_select_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'teacher-uploads'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Realtime: subscribe to status updates (avoid FULL replica on huge jsonb)
-- ---------------------------------------------------------------------------
ALTER TABLE public.dance_library REPLICA IDENTITY DEFAULT;

-- Realtime: in Supabase Dashboard → Database → Replication, add table
-- public.dance_library (or run once: ALTER PUBLICATION supabase_realtime ADD TABLE public.dance_library;)
