-- Join date for admin directory (backfilled from activity or profile updated_at).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.profiles p
SET created_at = sub.m
FROM (
  SELECT
    pr.id,
    COALESCE(
      (SELECT MIN(ps.created_at) FROM public.practice_sessions ps WHERE ps.user_id = pr.id),
      pr.updated_at,
      now()
    ) AS m
  FROM public.profiles pr
) sub
WHERE p.id = sub.id AND p.created_at IS NULL;

UPDATE public.profiles
SET created_at = COALESCE(updated_at, now())
WHERE created_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET NOT NULL;

COMMENT ON COLUMN public.profiles.created_at IS 'Member join date; backfilled from earliest practice session or profile updated_at.';
