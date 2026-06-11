-- CareBridge AI staff portal schema

CREATE TABLE IF NOT EXISTS public.ai_dynamic_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL UNIQUE REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  current_state JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  main_risk JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_communication_approach JSONB NOT NULL DEFAULT '[]'::jsonb,
  latest_change TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offline_counselling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transcript TEXT NOT NULL,
  audio_url TEXT,
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

CREATE TABLE IF NOT EXISTS public.staff_youth_views (
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id, youth_id)
);

CREATE INDEX IF NOT EXISTS idx_offline_sessions_youth_date
  ON public.offline_counselling_sessions(youth_id, session_date);
CREATE INDEX IF NOT EXISTS idx_youth_profiles_assigned_staff
  ON public.youth_profiles(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_youth_profiles_pending
  ON public.youth_profiles(assignment_status)
  WHERE assignment_status = 'pending';

CREATE TRIGGER ai_dynamic_insights_updated_at
  BEFORE UPDATE ON public.ai_dynamic_insights
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER offline_counselling_sessions_updated_at
  BEFORE UPDATE ON public.offline_counselling_sessions
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Staff RLS helpers
CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = auth.uid() AND role = 'staff'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.staff_can_read_youth(youth_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.youth_profiles yp
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.youth_profiles yp
    WHERE yp.id = youth_uuid
      AND yp.assigned_staff_id = public.current_staff_profile_id()
  );
$$;

ALTER TABLE public.ai_dynamic_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_counselling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_youth_views ENABLE ROW LEVEL SECURITY;

-- Staff read/update youth_profiles for assignment
CREATE POLICY youth_profiles_staff_select ON public.youth_profiles
  FOR SELECT TO authenticated
  USING (
    public.staff_can_read_youth(id)
    OR user_id = public.current_profile_id()
  );

CREATE POLICY youth_profiles_staff_assign ON public.youth_profiles
  FOR UPDATE TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND assignment_status = 'pending'
    AND assigned_staff_id IS NULL
    AND onboarding_completed = true
  )
  WITH CHECK (
    assigned_staff_id = public.current_staff_profile_id()
    AND assignment_status = 'assigned'
  );

-- Staff read youth questionnaire
CREATE POLICY youth_questionnaire_staff_select ON public.youth_questionnaire
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

-- Staff read AI sessions/messages
CREATE POLICY ai_chat_sessions_staff_select ON public.ai_chat_sessions
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

CREATE POLICY ai_messages_staff_select ON public.ai_messages
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

-- Staff read youth profile rows for names
CREATE POLICY profiles_staff_select_youth ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR id IN (
      SELECT yp.user_id FROM public.youth_profiles yp
      WHERE public.staff_can_read_youth(yp.id)
    )
    OR id IN (
      SELECT assigned_staff_id FROM public.youth_profiles
      WHERE user_id = public.current_profile_id()
    )
  );

-- assigned_workers staff policies
CREATE POLICY assigned_workers_staff_select ON public.assigned_workers
  FOR SELECT TO authenticated
  USING (
    youth_id = public.current_youth_id()
    OR staff_id = public.current_staff_profile_id()
  );

CREATE POLICY assigned_workers_staff_insert ON public.assigned_workers
  FOR INSERT TO authenticated
  WITH CHECK (staff_id = public.current_staff_profile_id());

-- ai_dynamic_insights
CREATE POLICY ai_dynamic_insights_staff_select ON public.ai_dynamic_insights
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

CREATE POLICY ai_dynamic_insights_staff_insert ON public.ai_dynamic_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.staff_can_manage_youth(youth_id));

CREATE POLICY ai_dynamic_insights_staff_update ON public.ai_dynamic_insights
  FOR UPDATE TO authenticated
  USING (public.staff_can_manage_youth(youth_id))
  WITH CHECK (public.staff_can_manage_youth(youth_id));

-- offline_counselling_sessions
CREATE POLICY offline_sessions_staff_select ON public.offline_counselling_sessions
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

CREATE POLICY offline_sessions_staff_insert ON public.offline_counselling_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    staff_id = public.current_staff_profile_id()
    AND public.staff_can_manage_youth(youth_id)
  );

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

-- staff_youth_views
CREATE POLICY staff_youth_views_select ON public.staff_youth_views
  FOR SELECT TO authenticated
  USING (staff_id = public.current_staff_profile_id());

CREATE POLICY staff_youth_views_upsert ON public.staff_youth_views
  FOR INSERT TO authenticated
  WITH CHECK (staff_id = public.current_staff_profile_id());

CREATE POLICY staff_youth_views_update ON public.staff_youth_views
  FOR UPDATE TO authenticated
  USING (staff_id = public.current_staff_profile_id())
  WITH CHECK (staff_id = public.current_staff_profile_id());

GRANT SELECT, INSERT, UPDATE ON public.ai_dynamic_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.offline_counselling_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_youth_views TO authenticated;
GRANT INSERT ON public.assigned_workers TO authenticated;
