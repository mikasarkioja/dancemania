-- Teacher move labels / instructions for overlay captions at specific timestamps.
ALTER TABLE public.dance_library
ADD COLUMN IF NOT EXISTS instructions jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.dance_library.instructions IS 'Move segments [{ startTime, endTime, pattern, teacherInstruction }] for overlay text at playback.';
