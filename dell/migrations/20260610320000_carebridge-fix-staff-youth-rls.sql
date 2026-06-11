-- CareBridge AI — fix staff RLS on youth_profiles (pending assignment)
--
-- WHY SQL Editor shows rows but Staff Dashboard gets []:
--   SQL Editor runs as admin/service role and bypasses RLS.
--   The app queries with the staff JWT (role = authenticated) where RLS is enforced.
--   If no SELECT policy allows staff to read rows with assigned_staff_id IS NULL,
--   PostgreSQL silently filters them out → SDK returns data: [], error: null.
--
-- EXISTING youth_profiles policies (from prior migrations):
--   youth_profiles_select_own   — SELECT where user_id = current_profile_id()  [youth owns row]
--   youth_profiles_insert_own   — INSERT own row
--   youth_profiles_update_own   — UPDATE own row
--   youth_profiles_staff_select — SELECT via staff_can_read_youth(id) OR own row  [staff portal]
--   youth_profiles_staff_assign   — UPDATE to claim unassigned youth              [staff portal]
--
-- Run in InsForge → Database → SQL Editor

CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
    AND role = 'staff'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.staff_can_read_youth(youth_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.youth_profiles yp
    WHERE yp.id = youth_uuid
      AND public.current_staff_profile_id() IS NOT NULL
      AND (
        yp.assigned_staff_id IS NULL
        OR yp.assigned_staff_id = public.current_staff_profile_id()
      )
  );
$$;

DROP POLICY IF EXISTS youth_profiles_staff_select ON public.youth_profiles;

CREATE POLICY youth_profiles_staff_select ON public.youth_profiles
  FOR SELECT TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND (
      assigned_staff_id IS NULL
      OR assigned_staff_id = public.current_staff_profile_id()
    )
  );

DROP POLICY IF EXISTS youth_profiles_staff_assign ON public.youth_profiles;

CREATE POLICY youth_profiles_staff_assign ON public.youth_profiles
  FOR UPDATE TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND assigned_staff_id IS NULL
  )
  WITH CHECK (
    assigned_staff_id = public.current_staff_profile_id()
    AND assignment_status = 'assigned'
  );

-- Verify policies (optional — run separately to inspect):
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'youth_profiles'
-- ORDER BY policyname;
