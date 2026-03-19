-- profiles.omatase: Omatase (XP) balance for Student Progress Dashboard and Bloom Garden.
-- Persona (Seedling, Blossom, Performer) is derived client-side from XP tiers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS omatase integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.omatase IS 'Omatase (XP) balance; awarded on practice session completion. Drives Bloom Garden growth and persona.';

-- Award 10 XP per completed practice session (Guardian: RLS ensures user_id = auth.uid() on insert).
CREATE OR REPLACE FUNCTION public.award_omatase_on_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET omatase = omatase + 10
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_omatase_on_session ON public.practice_sessions;
CREATE TRIGGER trigger_award_omatase_on_session
  AFTER INSERT ON public.practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_omatase_on_session();

COMMENT ON FUNCTION public.award_omatase_on_session() IS 'Increments profiles.omatase by 10 when a practice_sessions row is inserted (user-scoped via RLS).';

-- Backfill: existing users get 10 XP per existing session (idempotent: only where omatase still 0 if desired, or always recalc)
UPDATE public.profiles p
SET omatase = COALESCE(
  (SELECT COUNT(*)::integer * 10 FROM public.practice_sessions ps WHERE ps.user_id = p.id),
  0
);
