-- Optional display name for a practice session (boutique naming from naming-engine).
ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS session_name text;

COMMENT ON COLUMN public.practice_sessions.session_name IS 'User-chosen or suggested name from Creative Director (naming-engine).';
