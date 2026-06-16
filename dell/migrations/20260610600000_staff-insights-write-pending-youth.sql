-- Allow staff who can read a youth case (including pending unassigned) to upsert ai_dynamic_insights.

DROP POLICY IF EXISTS ai_dynamic_insights_staff_insert ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_staff_insert ON public.ai_dynamic_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.staff_can_read_youth(youth_id));

DROP POLICY IF EXISTS ai_dynamic_insights_staff_update ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_staff_update ON public.ai_dynamic_insights
  FOR UPDATE TO authenticated
  USING (public.staff_can_read_youth(youth_id))
  WITH CHECK (public.staff_can_read_youth(youth_id));
