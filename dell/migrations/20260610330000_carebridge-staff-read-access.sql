-- CareBridge AI — staff READ access on existing youth tables (no new tables required)
-- Run this if Staff questionnaire / profiles / AI chat return null but SQL Editor shows data.
--
-- Also run migrations/20260610200000_carebridge-staff-schema.sql if you need:
--   ai_dynamic_insights, offline_counselling_sessions, staff_youth_views

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

-- youth_profiles (pending list — keep in sync)
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

-- youth_questionnaire ← fixes "Staff questionnaire result: null"
DROP POLICY IF EXISTS youth_questionnaire_staff_select ON public.youth_questionnaire;
CREATE POLICY youth_questionnaire_staff_select ON public.youth_questionnaire
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

-- profiles ← fixes profile: null on youth detail
DROP POLICY IF EXISTS profiles_staff_select_youth ON public.profiles;
CREATE POLICY profiles_staff_select_youth ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (
      public.current_staff_profile_id() IS NOT NULL
      AND id IN (
        SELECT yp.user_id
        FROM public.youth_profiles yp
        WHERE public.staff_can_read_youth(yp.id)
      )
    )
    OR id IN (
      SELECT assigned_staff_id
      FROM public.youth_profiles
      WHERE user_id = public.current_profile_id()
    )
  );

-- ai_chat_sessions + ai_messages ← fixes Staff Timeline
DROP POLICY IF EXISTS ai_chat_sessions_staff_select ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_staff_select ON public.ai_chat_sessions
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

DROP POLICY IF EXISTS ai_messages_staff_select ON public.ai_messages;
CREATE POLICY ai_messages_staff_select ON public.ai_messages
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

GRANT SELECT ON public.youth_questionnaire TO authenticated;
