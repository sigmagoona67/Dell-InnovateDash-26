-- =============================================================================
-- CareBridge: Offline Sessions — paste ALL of this into InsForge SQL Editor
-- Fixes: relation "public.offline_counselling_sessions" does not exist
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$ SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id FROM public.profiles
  WHERE auth_user_id = auth.uid() AND role = 'staff' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.staff_can_read_youth(youth_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.youth_profiles yp
    WHERE yp.id = youth_uuid
      AND yp.onboarding_completed = true
      AND (
        yp.assigned_staff_id = public.current_staff_profile_id()
        OR (yp.assignment_status = 'pending' AND yp.assigned_staff_id IS NULL)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_can_manage_youth(youth_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.youth_profiles yp
    WHERE yp.id = youth_uuid
      AND yp.assigned_staff_id = public.current_staff_profile_id()
  );
$$;

CREATE TABLE IF NOT EXISTS public.offline_counselling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transcript TEXT NOT NULL,
  audio_url TEXT,
  document_name TEXT,
  document_url TEXT,
  ai_summary TEXT,
  emotion_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  main_risk JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_communication_approach JSONB NOT NULL DEFAULT '[]'::jsonb,
  latest_change TEXT,
  suggested_follow_up TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_name TEXT;

ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_url TEXT;

DROP TRIGGER IF EXISTS offline_counselling_sessions_updated_at ON public.offline_counselling_sessions;
CREATE TRIGGER offline_counselling_sessions_updated_at
  BEFORE UPDATE ON public.offline_counselling_sessions
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.offline_counselling_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offline_sessions_staff_select ON public.offline_counselling_sessions;
CREATE POLICY offline_sessions_staff_select ON public.offline_counselling_sessions
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

DROP POLICY IF EXISTS offline_sessions_staff_insert ON public.offline_counselling_sessions;
CREATE POLICY offline_sessions_staff_insert ON public.offline_counselling_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    staff_id = public.current_staff_profile_id()
    AND public.staff_can_manage_youth(youth_id)
  );

DROP POLICY IF EXISTS offline_sessions_staff_update ON public.offline_counselling_sessions;
CREATE POLICY offline_sessions_staff_update ON public.offline_counselling_sessions
  FOR UPDATE TO authenticated
  USING (
    staff_id = public.current_staff_profile_id()
    AND public.staff_can_manage_youth(youth_id)
  )
  WITH CHECK (
    staff_id = public.current_staff_profile_id()
    AND public.staff_can_manage_youth(youth_id)
  );

GRANT SELECT, INSERT, UPDATE ON public.offline_counselling_sessions TO authenticated;

SELECT 'offline_counselling_sessions ready' AS status, COUNT(*) AS rows FROM public.offline_counselling_sessions;
