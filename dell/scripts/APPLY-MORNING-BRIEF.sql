ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS morning_brief JSONB;

SELECT 'morning_brief column ready' AS status
FROM public.ai_dynamic_insights
LIMIT 1;
