-- profiles: full_name, avatar_url, role (RBAC), bio (dance experience).
-- RLS: users select/update own; admins select/update all.
-- Trigger: create profile on auth signup.

-- 1) Enum for role
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.profiles.full_name IS 'Display name for the user.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Profile image URL (e.g. Supabase Storage).';
COMMENT ON COLUMN public.profiles.email IS 'Copied from auth.users on signup (for admin listing).';
COMMENT ON COLUMN public.profiles.role IS 'RBAC: student (default), teacher, admin.';
COMMENT ON COLUMN public.profiles.bio IS 'Dance experience, goals, or short bio.';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 3) RLS: admins can select and update any profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4) Trigger: create profile when a new user signs up (OTP or otherwise)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.email,
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a public.profiles row when a new auth.users row is inserted (OTP signup, etc.).';
