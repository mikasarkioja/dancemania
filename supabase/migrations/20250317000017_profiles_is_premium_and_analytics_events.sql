-- profiles.is_premium: bypass 3-free-practices gate (Founding Member / paid).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_premium IS 'True for Founding Member / paid; unlocks unlimited practice sessions.';

-- analytics_events: intent tracking (e.g. Upsell Click from Elite Access modal).
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_name text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events (e.g. upsell click).
CREATE POLICY "analytics_events_insert_own" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own events (optional; for transparency).
CREATE POLICY "analytics_events_select_own" ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.analytics_events IS 'Intent and product events (e.g. Upsell Click) for measuring commercial interest.';
