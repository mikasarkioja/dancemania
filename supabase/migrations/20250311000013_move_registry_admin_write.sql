-- move_registry: Gold Standard moves remain globally readable (SELECT).
-- Only users with app_metadata.role in ('admin', 'teacher') can INSERT/UPDATE/DELETE.

-- Drop default deny by creating explicit policies for write operations
DROP POLICY IF EXISTS "move_registry_insert_admin" ON public.move_registry;
CREATE POLICY "move_registry_insert_admin" ON public.move_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')
  );

DROP POLICY IF EXISTS "move_registry_update_admin" ON public.move_registry;
CREATE POLICY "move_registry_update_admin" ON public.move_registry
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')
  );

DROP POLICY IF EXISTS "move_registry_delete_admin" ON public.move_registry;
CREATE POLICY "move_registry_delete_admin" ON public.move_registry
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')
  );

-- SELECT remains "move_registry_select" USING (true) from 20250115000005
