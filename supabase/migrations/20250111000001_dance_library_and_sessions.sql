-- DanceAI: dance_library (teacher videos) and practice_sessions (student attempts)
-- Run with: supabase db push (or apply via Supabase Dashboard SQL editor)

-- Teacher video library. motion_dna stores PoseData/MotionDNA (JSONB) per .cursorrules.
CREATE TABLE IF NOT EXISTS public.dance_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  genre text NOT NULL CHECK (genre IN ('salsa', 'bachata', 'other')),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  video_url text NOT NULL,
  bpm integer,
  motion_dna jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for listing by genre/difficulty and for slug lookups
CREATE INDEX IF NOT EXISTS idx_dance_library_slug ON public.dance_library (slug);
CREATE INDEX IF NOT EXISTS idx_dance_library_genre_difficulty ON public.dance_library (genre, difficulty);
CREATE INDEX IF NOT EXISTS idx_dance_library_motion_dna ON public.dance_library USING gin (motion_dna);

-- Student practice sessions. Links to auth.users via user_id.
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.dance_library (id) ON DELETE CASCADE,
  score_total numeric,
  metrics jsonb,
  student_motion_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_video_id ON public.practice_sessions (video_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_metrics ON public.practice_sessions USING gin (metrics);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_motion ON public.practice_sessions USING gin (student_motion_data);

-- RLS: students can only read dance_library; full access for service role
ALTER TABLE public.dance_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- dance_library: public read
CREATE POLICY "dance_library_select" ON public.dance_library
  FOR SELECT USING (true);

-- practice_sessions: users see only their own rows
CREATE POLICY "practice_sessions_select_own" ON public.practice_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "practice_sessions_insert_own" ON public.practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "practice_sessions_update_own" ON public.practice_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Optional: admin role for inserting/updating dance_library (create role and policy as needed)
-- CREATE POLICY "dance_library_insert_admin" ON public.dance_library FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
-- CREATE POLICY "dance_library_update_admin" ON public.dance_library FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

COMMENT ON TABLE public.dance_library IS 'Teacher reference videos and MotionDNA (JSONB) for comparison';
COMMENT ON TABLE public.practice_sessions IS 'Student attempts: score, metrics, and student_motion_data (JSONB)';
