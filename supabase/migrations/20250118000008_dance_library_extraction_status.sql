-- Extraction pipeline: allow pending_analysis (waiting for pose extraction) and needs_labeling (motion_dna ready).
ALTER TABLE public.dance_library
  DROP CONSTRAINT IF EXISTS dance_library_status_check;

ALTER TABLE public.dance_library
  ADD CONSTRAINT dance_library_status_check
  CHECK (status IN ('draft', 'published', 'needs_relabeling', 'pending_analysis', 'needs_labeling'));

COMMENT ON COLUMN public.dance_library.status IS 'draft | published | needs_relabeling | pending_analysis (awaiting extraction) | needs_labeling (motion_dna ready for admin)';
