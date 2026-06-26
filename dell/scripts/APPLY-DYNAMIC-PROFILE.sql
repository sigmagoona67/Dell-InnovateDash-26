ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS dynamic_profile JSONB NOT NULL DEFAULT '{
    "interests": [],
    "personality": [],
    "preferred_communication_style": [],
    "living_arrangement": "",
    "current_challenges": [],
    "coping_methods": []
  }'::jsonb;

SELECT 'dynamic_profile column ready' AS status FROM public.ai_dynamic_insights LIMIT 1;
