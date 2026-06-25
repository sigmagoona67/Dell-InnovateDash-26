-- CareBridge microservices database (standalone Postgres)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS public;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- === 20260610143000_carebridge-youth-schema.sql ===
-- CareBridge AI youth portal schema

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES public.auth_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('youth', 'staff')),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.youth_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_name TEXT,
  assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignment_status TEXT NOT NULL DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'assigned')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.youth_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL UNIQUE REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  personality JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_communication_style JSONB NOT NULL DEFAULT '[]'::jsonb,
  living_arrangement TEXT,
  current_challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  coping_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  mood_check_in TEXT,
  title TEXT,
  ai_summary TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (youth_id, session_date)
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('youth', 'ai', 'system')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assigned_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE (youth_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_youth_profiles_user_id ON public.youth_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_youth_date ON public.ai_chat_sessions(youth_id, session_date);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session_id ON public.ai_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_youth_id ON public.ai_messages(youth_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER youth_profiles_updated_at
  BEFORE UPDATE ON public.youth_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER youth_questionnaire_updated_at
  BEFORE UPDATE ON public.youth_questionnaire
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS helpers
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid LIMIT 1;
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
  WHERE p.auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  LIMIT 1;
$$;

-- RLS disabled
-- RLS disabled
-- RLS disabled
-- RLS disabled
-- RLS disabled
-- RLS disabled

-- profiles: users manage own row; youth can read assigned staff basic info






-- youth_profiles






-- youth_questionnaire






-- ai_chat_sessions






-- ai_messages




-- assigned_workers (read own assignments)











CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  questionnaire_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_communication_style JSONB NOT NULL DEFAULT '[]'::jsonb,
  supporting_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  personality JSONB NOT NULL DEFAULT '[]'::jsonb,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,
  date_of_birth DATE,
  age INTEGER,
  gender TEXT,
  country TEXT,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  questionnaire_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === 20260610200000_carebridge-staff-schema.sql ===
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
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER offline_counselling_sessions_updated_at
  BEFORE UPDATE ON public.offline_counselling_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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
  WHERE auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid AND role = 'staff'
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

-- RLS disabled
-- RLS disabled
-- RLS disabled

-- Staff read/update youth_profiles for assignment




-- Staff read youth questionnaire


-- Staff read AI sessions/messages




-- Staff read youth profile rows for names


-- assigned_workers staff policies




-- ai_dynamic_insights






-- offline_counselling_sessions






-- staff_youth_views












-- === 20260610310000_carebridge-staff-assignment-rls.sql ===
-- CareBridge AI — staff can see ALL unassigned youth (assigned_staff_id IS NULL)
-- Run in InsForge SQL Editor if pending youth still do not appear on staff dashboard.

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
      AND (
        yp.assigned_staff_id = public.current_staff_profile_id()
        OR yp.assigned_staff_id IS NULL
      )
  );
$$;





-- Ensure every youth account has a youth_profiles row
INSERT INTO public.youth_profiles (user_id, preferred_name, assigned_staff_id, assignment_status, onboarding_completed)
SELECT p.id, COALESCE(p.display_name, split_part(p.email, '@', 1)), NULL, 'pending', false
FROM public.profiles p
LEFT JOIN public.youth_profiles yp ON yp.user_id = p.id
WHERE p.role = 'youth' AND yp.id IS NULL;

-- Normalize unassigned youth
UPDATE public.youth_profiles
SET assignment_status = 'pending', assigned_staff_id = NULL
WHERE assigned_staff_id IS NULL;


-- === 20260610320000_carebridge-fix-staff-youth-rls.sql ===
-- CareBridge AI — fix staff RLS on youth_profiles (pending assignment)
--
-- WHY SQL Editor shows rows but Staff Dashboard gets []:
--   SQL Editor runs as admin/service role and bypasses RLS.
--   The app queries with the staff JWT (role = authenticated) where RLS is enforced.
--   If no SELECT policy allows staff to read rows with assigned_staff_id IS NULL,
--   PostgreSQL silently filters them out → SDK returns data: [], error: null.
--
-- EXISTING youth_profiles policies (from prior migrations):
--   youth_profiles_select_own   — SELECT where user_id = current_profile_id()  [youth owns row]
--   youth_profiles_insert_own   — INSERT own row
--   youth_profiles_update_own   — UPDATE own row
--   youth_profiles_staff_select — SELECT via staff_can_read_youth(id) OR own row  [staff portal]
--   youth_profiles_staff_assign   — UPDATE to claim unassigned youth              [staff portal]
--
-- Run in InsForge → Database → SQL Editor

CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND role = 'staff'
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
      AND public.current_staff_profile_id() IS NOT NULL
      AND (
        yp.assigned_staff_id IS NULL
        OR yp.assigned_staff_id = public.current_staff_profile_id()
      )
  );
$$;









-- Verify policies (optional — run separately to inspect):
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'youth_profiles'
-- ORDER BY policyname;


-- === 20260610330000_carebridge-staff-read-access.sql ===
-- CareBridge AI — staff READ access on existing youth tables (no new tables required)
-- Run this if Staff questionnaire / profiles / AI chat return null but SQL Editor shows data.
--
-- Also run migrations/20260610200000_carebridge-staff-schema.sql if you need:
--   ai_dynamic_insights, offline_counselling_sessions, staff_youth_views

CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND role = 'staff'
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
      AND public.current_staff_profile_id() IS NOT NULL
      AND (
        yp.assigned_staff_id IS NULL
        OR yp.assigned_staff_id = public.current_staff_profile_id()
      )
  );
$$;

-- youth_profiles (pending list — keep in sync)



-- youth_questionnaire ← fixes "Staff questionnaire result: null"



-- profiles ← fixes profile: null on youth detail



-- ai_chat_sessions + ai_messages ← fixes Staff Timeline









-- === 20260610340000_ai-dynamic-insights-overall-summary.sql ===
-- AI Dynamic Insights: overall youth summary + youth chat can upsert via edge function

ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS overall_summary TEXT;









-- === 20260610350000_carebridge-dynamic-insights-complete.sql ===
-- Ensure ai_dynamic_insights exists and youth chat can write / staff can read

CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id FROM public.profiles
  WHERE auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid AND role = 'staff'
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.youth_profiles yp
    WHERE yp.id = youth_uuid
      AND yp.assigned_staff_id = public.current_staff_profile_id()
  );
$$;

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

-- RLS disabled



















-- === 20260610400000_ai-morning-brief.sql ===
ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS morning_brief JSONB;


-- === 20260610400000_offline-session-documents.sql ===
ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_name TEXT;

ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_url TEXT;


-- === 20260610500000_ai-dynamic-profile.sql ===
ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS dynamic_profile JSONB NOT NULL DEFAULT '{
    "interests": [],
    "personality": [],
    "preferred_communication_style": [],
    "living_arrangement": "",
    "current_challenges": [],
    "coping_methods": []
  }'::jsonb;


-- === 20260610600000_fix-staff-read-youth.sql ===
-- Staff must read youth AI messages/insights even if onboarding_completed flag is stale.
-- Without this, staff see empty ai_messages and Profile never updates from live chat.

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
      AND public.current_staff_profile_id() IS NOT NULL
      AND (
        yp.assigned_staff_id IS NULL
        OR yp.assigned_staff_id = public.current_staff_profile_id()
      )
  );
$$;


-- === 20260610600000_staff-insights-write-pending-youth.sql ===
-- Allow staff who can read a youth case (including pending unassigned) to upsert ai_dynamic_insights.








-- === 20260610700000_dashboard-card-fields.sql ===
ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS current_concern TEXT,
  ADD COLUMN IF NOT EXISTS case_preview TEXT;


-- === 20260610800000_staff-edited-fields.sql ===
-- Staff manual edits on insights and session summaries feed future AI regen as sources.

ALTER TABLE ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS staff_edited_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ai_chat_sessions
  ADD COLUMN IF NOT EXISTS staff_edited_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS staff_edited_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ai_dynamic_insights.staff_edited_fields IS
  'Map of field key -> ISO timestamp when staff last edited; edited values live in the main columns.';

COMMENT ON COLUMN ai_chat_sessions.staff_edited_fields IS
  'Tracks staff-edited session fields (e.g. ai_summary) for AI context on regen.';

COMMENT ON COLUMN offline_counselling_sessions.staff_edited_fields IS
  'Tracks staff-edited offline session fields for AI context on regen.';


-- === 20260610810000_staff-session-summary-edit.sql ===
-- Staff can edit AI session summaries (Timeline → AI Summary → Edit).




-- Allow staff to edit approved offline session summaries they can read (not only original uploader).




-- === 20260610820000_staff-edit-assigned-only.sql ===
-- Staff edits (insights + session summaries) only for assigned worker of that youth.














-- === 20260617150000_carebridge-staff-team-directory.sql ===
-- CareBridge AI: staff team directory — peers can view each other's profiles and caseloads

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
      AND public.current_staff_profile_id() IS NOT NULL
  );
$$;














-- === 20260619000000_onboarding-profiles-extended.sql ===
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
    
  END IF;
END $$;


-- === 20260619100000_onboarding-questionnaire-version.sql ===
-- Track onboarding questionnaire version so login can require re-completion after feature updates.

ALTER TABLE public.youth_questionnaire
  ADD COLUMN IF NOT EXISTS questionnaire_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.staff_questionnaire
  ADD COLUMN IF NOT EXISTS questionnaire_version INTEGER NOT NULL DEFAULT 0;


-- === 20260622044826_carebridge-schedule-schema.sql ===
-- CareBridge AI schedule & consultation schema

CREATE TABLE IF NOT EXISTS public.staff_schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  youth_id UUID REFERENCES public.youth_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS public.staff_schedule_day_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, note_date)
);

CREATE TABLE IF NOT EXISTS public.youth_free_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (youth_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  staff_slot_id UUID REFERENCES public.staff_schedule_slots(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_schedule_slots_staff_date
  ON public.staff_schedule_slots(staff_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_youth_free_slots_youth_date
  ON public.youth_free_slots(youth_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_staff_status
  ON public.consultation_requests(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_youth
  ON public.consultation_requests(youth_id, status);

CREATE TRIGGER staff_schedule_slots_updated_at
  BEFORE UPDATE ON public.staff_schedule_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER staff_schedule_day_notes_updated_at
  BEFORE UPDATE ON public.staff_schedule_day_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER consultation_requests_updated_at
  BEFORE UPDATE ON public.consultation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS disabled
-- RLS disabled
-- RLS disabled
-- RLS disabled

-- Staff manages own schedule








-- Youth free slots




-- Consultation requests
















-- === 20260622120000_carebridge-schedule-request-flow.sql ===
-- Extend consultation request flow: initiated_by, withdrawn status

ALTER TABLE public.consultation_requests
  DROP CONSTRAINT IF EXISTS consultation_requests_status_check;

ALTER TABLE public.consultation_requests
  ADD CONSTRAINT consultation_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'withdrawn'));

ALTER TABLE public.consultation_requests
  ADD COLUMN IF NOT EXISTS initiated_by TEXT NOT NULL DEFAULT 'youth';

ALTER TABLE public.consultation_requests
  DROP CONSTRAINT IF EXISTS consultation_requests_initiated_by_check;

ALTER TABLE public.consultation_requests
  ADD CONSTRAINT consultation_requests_initiated_by_check
  CHECK (initiated_by IN ('youth', 'staff'));

-- Staff can create meeting requests for assigned youth




-- Staff can withdraw their own pending requests




-- Either party can cancel an accepted meeting









-- === 20260623100000_carebridge-schedule-youth-accept.sql ===
-- Allow youth to accept staff meeting requests (book worker slot + respond to request)














-- === 20260624100000_carebridge-staff-schedule-viewed.sql ===
-- Track when staff last opened a youth's Schedule tab (clears meeting-response badges)

ALTER TABLE public.staff_youth_views
  ADD COLUMN IF NOT EXISTS last_schedule_viewed_at TIMESTAMPTZ;


-- === 20260625100000_carebridge-crisis-detection.sql ===
-- Crisis detection flags for youth AI chat safety monitoring (staff dashboard visibility)

ALTER TABLE public.ai_chat_sessions
  ADD COLUMN IF NOT EXISTS crisis_detected BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS crisis_detected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_crisis_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ai_chat_sessions.crisis_detected IS
  'True when AI safety assessment detected high-risk / crisis-level content in this session.';

COMMENT ON COLUMN public.ai_dynamic_insights.crisis_detected IS
  'True when any youth AI chat session triggered crisis-level safety detection.';

COMMENT ON COLUMN public.ai_dynamic_insights.last_crisis_at IS
  'Timestamp of the most recent crisis-level AI chat detection for this youth.';


-- === 20260626100000_carebridge-reassignment-requests.sql ===
-- Reassignment requests from youth or assigned staff

CREATE TABLE IF NOT EXISTS public.reassignment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('youth', 'staff')),
  requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reassignment_requests_youth
  ON public.reassignment_requests(youth_id, created_at DESC);

-- RLS disabled












-- === 20260626200000_carebridge-staff-release-case.sql ===
-- Allow assigned staff to release a youth back to the unassigned pool




-- === 20260626300000_carebridge-reassignment-staff-update.sql ===
-- Allow staff to close reassignment notifications after releasing a case,
-- or when reclaiming an unassigned youth from the pool (fresh assignment).







-- === 20260626400000_carebridge-reassignment-assign-cleanup.sql ===
-- Close stale youth reassignment notices when a case is released or reclaimed.
-- Also allow staff to update assigned_workers rows (reactivate after pool reclaim).






CREATE OR REPLACE FUNCTION public.close_youth_reassignment_on_assignment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.assigned_staff_id IS NOT NULL
      AND NEW.assigned_staff_id IS NULL
    ) OR (
      OLD.assigned_staff_id IS NULL
      AND NEW.assigned_staff_id IS NOT NULL
    ) THEN
      UPDATE public.reassignment_requests
      SET status = 'closed'
      WHERE youth_id = NEW.id
        AND status = 'pending'
        AND requested_by = 'youth';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS youth_profiles_close_reassignment_on_assignment_change ON public.youth_profiles;
CREATE TRIGGER youth_profiles_close_reassignment_on_assignment_change
  AFTER UPDATE OF assigned_staff_id, assignment_status ON public.youth_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.close_youth_reassignment_on_assignment_change();

