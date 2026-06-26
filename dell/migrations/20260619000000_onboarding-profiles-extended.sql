-- Extended onboarding questionnaire fields (aligned with production schema)

ALTER TABLE public.youth_questionnaire
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_worker_gender TEXT,
  ADD COLUMN IF NOT EXISTS preferred_worker_age_range TEXT;

ALTER TABLE public.staff_questionnaire
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS languages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- staff_profiles and staff_questionnaire already exist in production with:
-- staff_profiles(profile_id, questionnaire_completed)
-- staff_questionnaire(staff_id -> profiles.id, preferred_communication_style, supporting_strengths, ...)

-- Youth read assigned worker questionnaire (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'staff_questionnaire'
      AND policyname = 'staff_questionnaire_youth_assigned_select'
  ) THEN
    CREATE POLICY staff_questionnaire_youth_assigned_select ON public.staff_questionnaire
      FOR SELECT TO authenticated
      USING (
        staff_id IN (
          SELECT yp.assigned_staff_id
          FROM public.youth_profiles yp
          JOIN public.profiles p ON p.id = yp.user_id
          WHERE p.auth_user_id = auth.uid()
            AND yp.assignment_status = 'assigned'
            AND yp.assigned_staff_id IS NOT NULL
        )
      );
  END IF;
END $$;
