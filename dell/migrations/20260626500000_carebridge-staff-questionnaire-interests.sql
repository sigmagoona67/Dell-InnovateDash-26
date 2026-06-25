-- Staff questionnaire: areas of support (interests)
ALTER TABLE public.staff_questionnaire
  ADD COLUMN IF NOT EXISTS interests JSONB NOT NULL DEFAULT '[]'::jsonb;
