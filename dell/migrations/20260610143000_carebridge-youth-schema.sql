-- CareBridge AI youth portal schema

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER youth_profiles_updated_at
  BEFORE UPDATE ON public.youth_profiles
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER youth_questionnaire_updated_at
  BEFORE UPDATE ON public.youth_questionnaire
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- RLS helpers
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_workers ENABLE ROW LEVEL SECURITY;

-- profiles: users manage own row; youth can read assigned staff basic info
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR id IN (
    SELECT assigned_staff_id FROM public.youth_profiles WHERE user_id = public.current_profile_id()
  ));

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- youth_profiles
CREATE POLICY youth_profiles_select_own ON public.youth_profiles
  FOR SELECT TO authenticated
  USING (user_id = public.current_profile_id());

CREATE POLICY youth_profiles_insert_own ON public.youth_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_profile_id());

CREATE POLICY youth_profiles_update_own ON public.youth_profiles
  FOR UPDATE TO authenticated
  USING (user_id = public.current_profile_id())
  WITH CHECK (user_id = public.current_profile_id());

-- youth_questionnaire
CREATE POLICY youth_questionnaire_select_own ON public.youth_questionnaire
  FOR SELECT TO authenticated
  USING (youth_id = public.current_youth_id());

CREATE POLICY youth_questionnaire_insert_own ON public.youth_questionnaire
  FOR INSERT TO authenticated
  WITH CHECK (youth_id = public.current_youth_id());

CREATE POLICY youth_questionnaire_update_own ON public.youth_questionnaire
  FOR UPDATE TO authenticated
  USING (youth_id = public.current_youth_id())
  WITH CHECK (youth_id = public.current_youth_id());

-- ai_chat_sessions
CREATE POLICY ai_chat_sessions_select_own ON public.ai_chat_sessions
  FOR SELECT TO authenticated
  USING (youth_id = public.current_youth_id());

CREATE POLICY ai_chat_sessions_insert_own ON public.ai_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (youth_id = public.current_youth_id());

CREATE POLICY ai_chat_sessions_update_own ON public.ai_chat_sessions
  FOR UPDATE TO authenticated
  USING (youth_id = public.current_youth_id())
  WITH CHECK (youth_id = public.current_youth_id());

-- ai_messages
CREATE POLICY ai_messages_select_own ON public.ai_messages
  FOR SELECT TO authenticated
  USING (youth_id = public.current_youth_id());

CREATE POLICY ai_messages_insert_own ON public.ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (youth_id = public.current_youth_id());

-- assigned_workers (read own assignments)
CREATE POLICY assigned_workers_select_own ON public.assigned_workers
  FOR SELECT TO authenticated
  USING (youth_id = public.current_youth_id());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.youth_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.youth_questionnaire TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_chat_sessions TO authenticated;
GRANT SELECT, INSERT ON public.ai_messages TO authenticated;
GRANT SELECT ON public.assigned_workers TO authenticated;
