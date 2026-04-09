-- Allow any signed-in user to insert dance_library rows they own.
--
-- Previous policy (dance_library_insert_teacher_creator) required profiles.role /
-- JWT teacher|admin, which blocked admin UI uploads for accounts still marked student.
-- For testing and studio ingest, owning the row (creator_id = auth.uid()) is enough.

DROP POLICY IF EXISTS "dance_library_insert_teacher_creator" ON public.dance_library;

CREATE POLICY "dance_library_insert_authenticated_owner"
  ON public.dance_library
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());
