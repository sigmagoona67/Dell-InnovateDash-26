ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS dynamic_profile JSONB NOT NULL DEFAULT '{
    "interests": [],
    "personality": [],
    "preferred_communication_style": [],
    "living_arrangement": "",
    "current_challenges": [],
    "coping_methods": []
  }'::jsonb;
