-- profiles RLS: fix "infinite recursion detected in policy for relation profiles"
--
-- Policies that do EXISTS (SELECT 1 FROM public.profiles ...) re-enter RLS on the
-- same table. Use a SECURITY DEFINER helper (runs as owner, bypasses RLS) instead.

CREATE OR REPLACE FUNCTION public.current_user_is_profiles_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'admin'::public.user_role
  );
$$;

COMMENT ON FUNCTION public.current_user_is_profiles_admin() IS
  'True if auth.uid() has role admin in profiles; SECURITY DEFINER avoids recursive RLS on profiles.';

GRANT EXECUTE ON FUNCTION public.current_user_is_profiles_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_profiles_admin() TO service_role;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.current_user_is_profiles_admin()
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.current_user_is_profiles_admin()
  )
  WITH CHECK (
    auth.uid() = id
    OR public.current_user_is_profiles_admin()
  );
