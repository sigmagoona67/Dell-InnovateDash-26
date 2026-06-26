-- Staff edits (insights + session summaries) only for assigned worker of that youth.

DROP POLICY IF EXISTS ai_chat_sessions_staff_update ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_staff_update ON public.ai_chat_sessions
  FOR UPDATE TO authenticated
  USING (public.staff_can_manage_youth(youth_id))
  WITH CHECK (public.staff_can_manage_youth(youth_id));

DROP POLICY IF EXISTS offline_sessions_staff_update ON public.offline_counselling_sessions;
CREATE POLICY offline_sessions_staff_update ON public.offline_counselling_sessions
  FOR UPDATE TO authenticated
  USING (public.staff_can_manage_youth(youth_id))
  WITH CHECK (public.staff_can_manage_youth(youth_id));

DROP POLICY IF EXISTS ai_dynamic_insights_staff_insert ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_staff_insert ON public.ai_dynamic_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.staff_can_manage_youth(youth_id));

DROP POLICY IF EXISTS ai_dynamic_insights_staff_update ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_staff_update ON public.ai_dynamic_insights
  FOR UPDATE TO authenticated
  USING (public.staff_can_manage_youth(youth_id))
  WITH CHECK (public.staff_can_manage_youth(youth_id));
