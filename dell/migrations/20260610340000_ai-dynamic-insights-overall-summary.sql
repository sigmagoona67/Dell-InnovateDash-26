-- AI Dynamic Insights: overall youth summary + youth chat can upsert via edge function

ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS overall_summary TEXT;

DROP POLICY IF EXISTS ai_dynamic_insights_youth_insert ON public.ai_dynamic_insights;
DROP POLICY IF EXISTS ai_dynamic_insights_youth_update ON public.ai_dynamic_insights;

CREATE POLICY ai_dynamic_insights_youth_insert ON public.ai_dynamic_insights
  FOR INSERT TO authenticated
  WITH CHECK (youth_id = public.current_youth_id());

CREATE POLICY ai_dynamic_insights_youth_update ON public.ai_dynamic_insights
  FOR UPDATE TO authenticated
  USING (youth_id = public.current_youth_id())
  WITH CHECK (youth_id = public.current_youth_id());
