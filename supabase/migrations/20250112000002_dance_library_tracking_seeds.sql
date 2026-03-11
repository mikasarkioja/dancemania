-- Add tracking_seeds JSONB to dance_library for Leader/Follower seed points (x,y normalized 0-1).
ALTER TABLE public.dance_library
ADD COLUMN IF NOT EXISTS tracking_seeds jsonb;

COMMENT ON COLUMN public.dance_library.tracking_seeds IS 'Mid-hip anchor seeds { leader_hip_seed: { x, y }, follower_hip_seed: { x, y } } for stable tracking; x,y normalized 0-1. Extraction uses findBestMatch(click, mid_hip per skeleton).';
