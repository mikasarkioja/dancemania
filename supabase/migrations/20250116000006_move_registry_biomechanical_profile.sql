-- Biomechanical profile (target ranges) and candidate moves / kinetic chain.
ALTER TABLE public.move_registry
  ADD COLUMN IF NOT EXISTS biomechanical_profile jsonb,
  ADD COLUMN IF NOT EXISTS kinetic_chain text;

ALTER TABLE public.move_registry
  DROP CONSTRAINT IF EXISTS move_registry_status_check;

ALTER TABLE public.move_registry
  ADD CONSTRAINT move_registry_status_check
  CHECK (status IN ('approved', 'pending', 'candidate'));

COMMENT ON COLUMN public.move_registry.biomechanical_profile IS 'Target ranges (hip_tilt_max, knee_flexion_avg, etc. with { min, max }) and SignatureCalculator curves: hip_tilt_curve, foot_velocity_curve, knee_flexion_curve (number[]).';
COMMENT ON COLUMN public.move_registry.kinetic_chain IS 'Category: isolation_body | footwork | partner_connection';
