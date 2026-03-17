-- uploaded_by: link dance_library rows to the user who uploaded (for GDPR erasure).
-- profiles.privacy_consent_granted: consent gate for camera/MediaPipe (GDPR).

-- 1) dance_library: who uploaded (NULL = legacy or admin-imported)
ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dance_library_uploaded_by ON public.dance_library (uploaded_by);
COMMENT ON COLUMN public.dance_library.uploaded_by IS 'User who uploaded this video; NULL = legacy or admin. Used for GDPR data erasure.';

-- 2) profiles table for consent (create if not exists; Supabase often has public.profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  privacy_consent_granted boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/update only their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Insert on signup or first load: allow insert for own id only
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN public.profiles.privacy_consent_granted IS 'User has accepted privacy notice; required before camera/MediaPipe in Practice and Assessment.';

-- 3) practice_sessions: allow user to delete their own rows (GDPR erasure)
DROP POLICY IF EXISTS "practice_sessions_delete_own" ON public.practice_sessions;
CREATE POLICY "practice_sessions_delete_own" ON public.practice_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 4) dance_library: allow user to delete only rows they uploaded (GDPR erasure)
DROP POLICY IF EXISTS "dance_library_delete_own_uploads" ON public.dance_library;
CREATE POLICY "dance_library_delete_own_uploads" ON public.dance_library
  FOR DELETE USING (auth.uid() = uploaded_by);
