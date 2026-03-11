-- Move Registry: encyclopedia of dance moves with optional pending (auto-detected) entries.
CREATE TABLE IF NOT EXISTS public.move_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('Leader', 'Follower', 'Both')) DEFAULT 'Both',
  description text,
  teacher_tips text,
  biomechanical_signature jsonb,
  source_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_registry_category ON public.move_registry (category);
CREATE INDEX IF NOT EXISTS idx_move_registry_status ON public.move_registry (status);
CREATE INDEX IF NOT EXISTS idx_move_registry_name ON public.move_registry (name);

COMMENT ON TABLE public.move_registry IS 'Encyclopedia of dance moves; biomechanical_signature = static pose (joints) for 3D view. Pending = auto-detected, awaiting review.';
COMMENT ON COLUMN public.move_registry.biomechanical_signature IS 'Static 3D pose: { joints: Record<string, { x, y, z, visibility? }> } normalized 0-1';
COMMENT ON COLUMN public.move_registry.source_urls IS 'URLs where this move was referenced or scraped from.';

-- Many-to-many: which videos demonstrate which moves.
CREATE TABLE IF NOT EXISTS public.video_moves (
  video_id uuid NOT NULL REFERENCES public.dance_library (id) ON DELETE CASCADE,
  move_id uuid NOT NULL REFERENCES public.move_registry (id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, move_id)
);

CREATE INDEX IF NOT EXISTS idx_video_moves_video_id ON public.video_moves (video_id);
CREATE INDEX IF NOT EXISTS idx_video_moves_move_id ON public.video_moves (move_id);

COMMENT ON TABLE public.video_moves IS 'Junction: dance_library <-> move_registry (videos that demonstrate each move).';

ALTER TABLE public.move_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "move_registry_select" ON public.move_registry FOR SELECT USING (true);
CREATE POLICY "video_moves_select" ON public.video_moves FOR SELECT USING (true);
