-- Boutique display name from auto-naming (process_pending / extraction pipeline).
-- When set, UI may show this instead of title. Only set for generic filenames (IMG_, video_, v_).
ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN public.dance_library.display_name IS 'Boutique name from auto-naming; only set when title is generic (IMG_, video_, v_). Manual names are not overwritten.';
