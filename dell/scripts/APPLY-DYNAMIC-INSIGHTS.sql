-- =============================================================================
-- CareBridge: AI Dynamic Insights — paste ALL of this into InsForge SQL Editor
-- (Do NOT paste the file path. Copy everything from this file and Run.)
-- =============================================================================

-- Prerequisite RLS helper functions (safe to re-run)
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_youth_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;
$$;

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

-- Table
CREATE TABLE IF NOT EXISTS public.ai_dynamic_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL UNIQUE REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  current_state JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  main_risk JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_communication_approach JSONB NOT NULL DEFAULT '[]'::jsonb,
  latest_change TEXT,
  overall_summary TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS overall_summary TEXT;

ALTER TABLE public.ai_dynamic_insights ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS ai_dynamic_insights_updated_at ON public.ai_dynamic_insights;
CREATE TRIGGER ai_dynamic_insights_updated_at
  BEFORE UPDATE ON public.ai_dynamic_insights
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

DROP POLICY IF EXISTS ai_dynamic_insights_staff_select ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_staff_select ON public.ai_dynamic_insights
  FOR SELECT TO authenticated
  USING (public.staff_can_read_youth(youth_id));

DROP POLICY IF EXISTS ai_dynamic_insights_staff_insert ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_staff_insert ON public.ai_dynamic_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.staff_can_manage_youth(youth_id));

DROP POLICY IF EXISTS ai_dynamic_insights_staff_update ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_staff_update ON public.ai_dynamic_insights
  FOR UPDATE TO authenticated
  USING (public.staff_can_manage_youth(youth_id))
  WITH CHECK (public.staff_can_manage_youth(youth_id));

DROP POLICY IF EXISTS ai_dynamic_insights_youth_insert ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_youth_insert ON public.ai_dynamic_insights
  FOR INSERT TO authenticated
  WITH CHECK (youth_id = public.current_youth_id());

DROP POLICY IF EXISTS ai_dynamic_insights_youth_update ON public.ai_dynamic_insights;
CREATE POLICY ai_dynamic_insights_youth_update ON public.ai_dynamic_insights
  FOR UPDATE TO authenticated
  USING (youth_id = public.current_youth_id())
  WITH CHECK (youth_id = public.current_youth_id());

GRANT SELECT, INSERT, UPDATE ON public.ai_dynamic_insights TO authenticated;

SELECT 'ai_dynamic_insights ready' AS status,
       COUNT(*) AS existing_rows
FROM public.ai_dynamic_insights;
