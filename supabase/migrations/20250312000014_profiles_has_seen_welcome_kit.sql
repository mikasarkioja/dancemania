-- Welcome Kit: show once per user; skip for Admin/Teacher.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_welcome_kit boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.has_seen_welcome_kit IS 'True after user completes the Test User Welcome Kit overlay; prevents showing again.';
