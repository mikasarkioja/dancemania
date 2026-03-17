-- Post-assessment: mark user as having completed assessment.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_completed_assessment boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.has_completed_assessment IS 'Set when user completes assessment and chooses Continue with 3 free practices.';
