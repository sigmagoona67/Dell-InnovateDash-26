-- Track onboarding questionnaire version so login can require re-completion after feature updates.

ALTER TABLE public.youth_questionnaire
  ADD COLUMN IF NOT EXISTS questionnaire_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.staff_questionnaire
  ADD COLUMN IF NOT EXISTS questionnaire_version INTEGER NOT NULL DEFAULT 0;
