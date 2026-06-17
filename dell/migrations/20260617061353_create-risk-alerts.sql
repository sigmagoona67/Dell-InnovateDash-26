-- CareBridge AI: high-risk youth flagging for staff alerts

CREATE TABLE IF NOT EXISTS public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('medium', 'high')),
  ai_summary TEXT,
  trigger_message TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_status_created
  ON public.risk_alerts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_youth_status
  ON public.risk_alerts(youth_id, status);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_assigned_staff_status
  ON public.risk_alerts(assigned_staff_id, status)
  WHERE assigned_staff_id IS NOT NULL;

CREATE TRIGGER risk_alerts_updated_at
  BEFORE UPDATE ON public.risk_alerts
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE OR REPLACE FUNCTION public.staff_can_manage_alert(alert_youth_id UUID, alert_assigned_staff_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    public.current_staff_profile_id() IS NOT NULL
    AND (
      alert_assigned_staff_id = public.current_staff_profile_id()
      OR (
        alert_assigned_staff_id IS NULL
        AND public.staff_can_read_youth(alert_youth_id)
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.create_risk_alert_from_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  latest_youth_message TEXT;
  youth_assigned_staff UUID;
BEGIN
  IF NEW.risk_level <> 'high' OR OLD.risk_level = 'high' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.risk_alerts ra
    WHERE ra.session_id = NEW.id
      AND ra.status IN ('open', 'acknowledged')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT yp.assigned_staff_id
  INTO youth_assigned_staff
  FROM public.youth_profiles yp
  WHERE yp.id = NEW.youth_id;

  SELECT am.message
  INTO latest_youth_message
  FROM public.ai_messages am
  WHERE am.session_id = NEW.id
    AND am.sender = 'youth'
  ORDER BY am.created_at DESC
  LIMIT 1;

  INSERT INTO public.risk_alerts (
    youth_id,
    session_id,
    risk_level,
    ai_summary,
    trigger_message,
    status,
    assigned_staff_id
  ) VALUES (
    NEW.youth_id,
    NEW.id,
    'high',
    NEW.ai_summary,
    latest_youth_message,
    'open',
    youth_assigned_staff
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_chat_sessions_high_risk_alert ON public.ai_chat_sessions;

CREATE TRIGGER ai_chat_sessions_high_risk_alert
  AFTER UPDATE OF risk_level ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_risk_alert_from_session();

ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS risk_alerts_staff_select ON public.risk_alerts;
CREATE POLICY risk_alerts_staff_select
  ON public.risk_alerts
  FOR SELECT
  TO authenticated
  USING (public.staff_can_manage_alert(youth_id, assigned_staff_id));

DROP POLICY IF EXISTS risk_alerts_staff_update ON public.risk_alerts;
CREATE POLICY risk_alerts_staff_update
  ON public.risk_alerts
  FOR UPDATE
  TO authenticated
  USING (public.staff_can_manage_alert(youth_id, assigned_staff_id))
  WITH CHECK (public.staff_can_manage_alert(youth_id, assigned_staff_id));

GRANT SELECT, UPDATE ON public.risk_alerts TO authenticated;
