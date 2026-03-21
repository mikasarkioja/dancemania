-- Creator ownership (profiles.id), teacher isolation, analytics (video_usage_logs), RLS.

-- ---------------------------------------------------------------------------
-- 1) Enum + video_usage_logs
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.video_usage_action AS ENUM (
    'view',
    'practice_start',
    'practice_complete'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.video_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.dance_library (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action_type public.video_usage_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_usage_logs_video_id
  ON public.video_usage_logs (video_id);
CREATE INDEX IF NOT EXISTS idx_video_usage_logs_user_id
  ON public.video_usage_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_video_usage_logs_created_at
  ON public.video_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_usage_logs_video_action
  ON public.video_usage_logs (video_id, action_type);

COMMENT ON TABLE public.video_usage_logs IS 'Analytics: views and practice funnel per video and user.';

ALTER TABLE public.video_usage_logs ENABLE ROW LEVEL SECURITY;

-- Insert: only as self
DROP POLICY IF EXISTS "video_usage_logs_insert_own" ON public.video_usage_logs;
CREATE POLICY "video_usage_logs_insert_own"
  ON public.video_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Select: own rows, or teacher viewing logs for owned videos, or admin
DROP POLICY IF EXISTS "video_usage_logs_select_insights" ON public.video_usage_logs;
CREATE POLICY "video_usage_logs_select_insights"
  ON public.video_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.dance_library dl
      WHERE dl.id = video_usage_logs.video_id
        AND dl.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ---------------------------------------------------------------------------
-- 2) dance_library.creator_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dance_library_creator_id
  ON public.dance_library (creator_id);

COMMENT ON COLUMN public.dance_library.creator_id IS 'Owning teacher profile (profiles.id). Drives RLS for the Teacher''s Room.';

-- Backfill: prefer uploaded_by (same as profiles.id), else first admin profile
UPDATE public.dance_library dl
SET creator_id = dl.uploaded_by
WHERE dl.creator_id IS NULL
  AND dl.uploaded_by IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = dl.uploaded_by);

UPDATE public.dance_library dl
SET creator_id = (
  SELECT p.id FROM public.profiles p
  WHERE p.role = 'admin'
  ORDER BY p.id
  LIMIT 1
)
WHERE dl.creator_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3) move_registry.creator_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.move_registry
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_move_registry_creator_id
  ON public.move_registry (creator_id);

COMMENT ON COLUMN public.move_registry.creator_id IS 'Teacher who created this registry entry.';

UPDATE public.move_registry mr
SET creator_id = (
  SELECT p.id FROM public.profiles p
  WHERE p.role = 'admin'
  ORDER BY p.id
  LIMIT 1
)
WHERE mr.creator_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4) dance_library RLS — The Teacher's Room
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "dance_library_select" ON public.dance_library;
DROP POLICY IF EXISTS "dance_library_insert_authenticated" ON public.dance_library;
DROP POLICY IF EXISTS "dance_library_update_authenticated" ON public.dance_library;
DROP POLICY IF EXISTS "dance_library_delete_own_uploads" ON public.dance_library;

-- Students & guests: published only. Logged-in: + own drafts + admin sees all
CREATE POLICY "dance_library_select_catalog"
  ON public.dance_library
  FOR SELECT
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND creator_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Teachers & admins: insert only as creator (JWT fallback for role)
CREATE POLICY "dance_library_insert_teacher_creator"
  ON public.dance_library
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('teacher', 'admin')
      )
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')
    )
  );

CREATE POLICY "dance_library_update_teacher_or_admin"
  ON public.dance_library
  FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "dance_library_delete_teacher_or_admin"
  ON public.dance_library
  FOR DELETE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ---------------------------------------------------------------------------
-- 5) move_registry RLS — creator isolation (approved still public read)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "move_registry_select" ON public.move_registry;
DROP POLICY IF EXISTS "move_registry_insert_admin" ON public.move_registry;
DROP POLICY IF EXISTS "move_registry_update_admin" ON public.move_registry;
DROP POLICY IF EXISTS "move_registry_delete_admin" ON public.move_registry;

CREATE POLICY "move_registry_select_policy"
  ON public.move_registry
  FOR SELECT
  USING (
    status = 'approved'
    OR (auth.uid() IS NOT NULL AND creator_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "move_registry_insert_teacher"
  ON public.move_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('teacher', 'admin')
      )
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')
    )
  );

CREATE POLICY "move_registry_update_teacher_or_admin"
  ON public.move_registry
  FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "move_registry_delete_teacher_or_admin"
  ON public.move_registry
  FOR DELETE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ---------------------------------------------------------------------------
-- 6) video_moves — link only to videos you own (or admin)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "video_moves_insert_owner" ON public.video_moves;
CREATE POLICY "video_moves_insert_owner"
  ON public.video_moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dance_library dl
      WHERE dl.id = video_moves.video_id
        AND (
          dl.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
          OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "video_moves_delete_owner" ON public.video_moves;
CREATE POLICY "video_moves_delete_owner"
  ON public.video_moves
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dance_library dl
      WHERE dl.id = video_moves.video_id
        AND (
          dl.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
          OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    )
  );
