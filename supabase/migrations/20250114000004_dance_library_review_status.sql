-- Review & approval workflow for dance_library.
ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'needs_relabeling')),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.dance_library.status IS 'draft | published | needs_relabeling for review workflow';
COMMENT ON COLUMN public.dance_library.verified_at IS 'Set when approved & published';
COMMENT ON COLUMN public.dance_library.rejection_reason IS 'Admin reason when status = needs_relabeling';
