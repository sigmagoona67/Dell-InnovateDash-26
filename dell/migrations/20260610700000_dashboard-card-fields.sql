ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS current_concern TEXT,
  ADD COLUMN IF NOT EXISTS case_preview TEXT;
