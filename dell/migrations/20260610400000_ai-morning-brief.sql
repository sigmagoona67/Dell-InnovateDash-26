ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS morning_brief JSONB;
