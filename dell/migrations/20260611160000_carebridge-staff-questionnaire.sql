-- Staff personality quiz / profile questionnaire

CREATE TABLE IF NOT EXISTS public.staff_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  personality JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_communication_style JSONB NOT NULL DEFAULT '[]'::jsonb,
  supporting_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  additional_notes TEXT,
  quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_questionnaire_staff_id
  ON public.staff_questionnaire(staff_id);

CREATE TRIGGER staff_questionnaire_updated_at
  BEFORE UPDATE ON public.staff_questionnaire
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.staff_questionnaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_questionnaire_own_select ON public.staff_questionnaire
  FOR SELECT TO authenticated
  USING (staff_id = public.current_staff_profile_id());

CREATE POLICY staff_questionnaire_own_insert ON public.staff_questionnaire
  FOR INSERT TO authenticated
  WITH CHECK (staff_id = public.current_staff_profile_id());

CREATE POLICY staff_questionnaire_own_update ON public.staff_questionnaire
  FOR UPDATE TO authenticated
  USING (staff_id = public.current_staff_profile_id())
  WITH CHECK (staff_id = public.current_staff_profile_id());

GRANT SELECT, INSERT, UPDATE ON public.staff_questionnaire TO authenticated;
