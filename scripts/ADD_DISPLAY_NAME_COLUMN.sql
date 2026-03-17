-- Run this in Supabase Dashboard → SQL Editor if process_pending.py --auto-name
-- errors with "column dance_library.display_name does not exist"
ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN public.dance_library.display_name IS 'Boutique name from auto-naming; only set when title is generic (IMG_, video_, v_). Manual names are not overwritten.';
