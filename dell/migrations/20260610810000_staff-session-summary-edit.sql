-- Staff can edit AI session summaries (Timeline → AI Summary → Edit).

DROP POLICY IF EXISTS ai_chat_sessions_staff_update ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_staff_update ON public.ai_chat_sessions
  FOR UPDATE TO authenticated
  USING (public.staff_can_read_youth(youth_id))
  WITH CHECK (public.staff_can_read_youth(youth_id));

-- Allow staff to edit approved offline session summaries they can read (not only original uploader).
DROP POLICY IF EXISTS offline_sessions_staff_update ON public.offline_counselling_sessions;
CREATE POLICY offline_sessions_staff_update ON public.offline_counselling_sessions
  FOR UPDATE TO authenticated
  USING (public.staff_can_read_youth(youth_id))
  WITH CHECK (public.staff_can_read_youth(youth_id));
