-- Scope move registry entries by genre (Salsa vs Bachata). NULL = show in both until curated.
ALTER TABLE public.move_registry
  ADD COLUMN IF NOT EXISTS genre text CHECK (genre IN ('salsa', 'bachata', 'other'));

CREATE INDEX IF NOT EXISTS idx_move_registry_genre ON public.move_registry (genre);
COMMENT ON COLUMN public.move_registry.genre IS 'salsa | bachata | other; NULL = visible in both modes until set.';
