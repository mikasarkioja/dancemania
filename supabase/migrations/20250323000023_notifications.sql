-- Centralized in-app notifications ledger + RLS + automated Bloom / publish triggers.

-- ---------------------------------------------------------------------------
-- 1) Enum + table
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'content_approval',
    'move_verified',
    'xp_milestone',
    'system_alert'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE is_read = false;

COMMENT ON TABLE public.notifications IS 'User-scoped alerts; inserts via service role / SECURITY DEFINER triggers.';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No INSERT for authenticated clients (service role + triggers only).

-- ---------------------------------------------------------------------------
-- 2) Student Bloom tier milestone (profiles.omatase updates)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_bloom_milestone_on_omatase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_t smallint;
  new_t smallint;
BEGIN
  IF NEW.role IS DISTINCT FROM 'student' THEN
    RETURN NEW;
  END IF;

  old_t := CASE
    WHEN OLD.omatase >= 500 THEN 2
    WHEN OLD.omatase >= 100 THEN 1
    ELSE 0
  END;
  new_t := CASE
    WHEN NEW.omatase >= 500 THEN 2
    WHEN NEW.omatase >= 100 THEN 1
    ELSE 0
  END;

  IF new_t > old_t THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.id,
      'xp_milestone'::public.notification_type,
      'New Bloom tier',
      CASE new_t
        WHEN 1 THEN 'You reached Blossom — your practice is blooming.'
        WHEN 2 THEN 'You reached Performer — outstanding dedication.'
        ELSE 'Your Bloom garden leveled up.'
      END,
      '/dashboard'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_bloom_milestone ON public.profiles;
CREATE TRIGGER trigger_notify_bloom_milestone
  AFTER UPDATE OF omatase ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_bloom_milestone_on_omatase();

-- ---------------------------------------------------------------------------
-- 3) Teacher: video published (gold-standard verified)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_creator_on_video_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published'
     AND OLD.status IS DISTINCT FROM 'published'
     AND NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.creator_id,
      'move_verified'::public.notification_type,
      'Move published',
      '"' || LEFT(COALESCE(NEW.title, 'Your move'), 72) || '" is verified and live for students.',
      '/practice/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_creator_video_published ON public.dance_library;
CREATE TRIGGER trigger_notify_creator_video_published
  AFTER UPDATE OF status ON public.dance_library
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_creator_on_video_published();

-- ---------------------------------------------------------------------------
-- 4) Realtime (enable in Dashboard → Replication, or run once):
--    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;
