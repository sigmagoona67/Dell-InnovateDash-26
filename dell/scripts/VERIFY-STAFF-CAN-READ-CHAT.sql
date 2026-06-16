-- Run this in InsForge SQL Editor AFTER APPLY-DYNAMIC-INSIGHTS.sql
-- Lets Staff read youth AI chat (needed for Dynamic Insights + Timeline)

DROP POLICY IF EXISTS ai_chat_sessions_staff_select ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_staff_select ON public.ai_chat_sessions
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

DROP POLICY IF EXISTS ai_messages_staff_select ON public.ai_messages;
CREATE POLICY ai_messages_staff_select ON public.ai_messages
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

SELECT 'staff chat read policies ready' AS status;
