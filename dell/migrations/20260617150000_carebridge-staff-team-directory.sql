-- CareBridge AI: staff team directory — peers can view each other's profiles and caseloads

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
  );
$$;

DROP POLICY IF EXISTS youth_profiles_staff_select ON public.youth_profiles;

CREATE POLICY youth_profiles_staff_select ON public.youth_profiles
  FOR SELECT TO authenticated
  USING (public.current_staff_profile_id() IS NOT NULL);

DROP POLICY IF EXISTS profiles_staff_select_peers ON public.profiles;

CREATE POLICY profiles_staff_select_peers ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND role = 'staff'
  );

DROP POLICY IF EXISTS staff_questionnaire_peer_select ON public.staff_questionnaire;

CREATE POLICY staff_questionnaire_peer_select ON public.staff_questionnaire
  FOR SELECT TO authenticated
  USING (public.current_staff_profile_id() IS NOT NULL);
