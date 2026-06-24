-- CareBridge: reassignment notifications (youth → staff dashboard)
-- Run in InsForge → Database → SQL Editor

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

ALTER TABLE public.reassignment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reassignment_requests_youth_select ON public.reassignment_requests;
CREATE POLICY reassignment_requests_youth_select ON public.reassignment_requests
  FOR SELECT TO authenticated
  USING (youth_id = public.current_youth_id());

DROP POLICY IF EXISTS reassignment_requests_youth_insert ON public.reassignment_requests;
CREATE POLICY reassignment_requests_youth_insert ON public.reassignment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = 'youth'
    AND requester_profile_id = public.current_profile_id()
    AND youth_id = public.current_youth_id()
  );

DROP POLICY IF EXISTS reassignment_requests_staff_select ON public.reassignment_requests;
CREATE POLICY reassignment_requests_staff_select ON public.reassignment_requests
  FOR SELECT TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND youth_id IN (
      SELECT id FROM public.youth_profiles
      WHERE assigned_staff_id = public.current_staff_profile_id()
    )
  );

DROP POLICY IF EXISTS reassignment_requests_staff_insert ON public.reassignment_requests;
CREATE POLICY reassignment_requests_staff_insert ON public.reassignment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = 'staff'
    AND requester_profile_id = public.current_staff_profile_id()
    AND youth_id IN (
      SELECT id FROM public.youth_profiles
      WHERE assigned_staff_id = public.current_staff_profile_id()
    )
  );

DROP POLICY IF EXISTS reassignment_requests_staff_update ON public.reassignment_requests;
CREATE POLICY reassignment_requests_staff_update ON public.reassignment_requests
  FOR UPDATE TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND (
      assigned_staff_id = public.current_staff_profile_id()
      OR youth_id IN (
        SELECT id FROM public.youth_profiles WHERE assigned_staff_id IS NULL
      )
    )
  )
  WITH CHECK (
    public.current_staff_profile_id() IS NOT NULL
  );

GRANT SELECT, INSERT, UPDATE ON public.reassignment_requests TO authenticated;

-- Allow staff to reactivate assigned_workers after reclaiming from pool
DROP POLICY IF EXISTS assigned_workers_staff_update ON public.assigned_workers;
CREATE POLICY assigned_workers_staff_update ON public.assigned_workers
  FOR UPDATE TO authenticated
  USING (staff_id = public.current_staff_profile_id())
  WITH CHECK (staff_id = public.current_staff_profile_id());

GRANT UPDATE ON public.assigned_workers TO authenticated;

-- Auto-close stale reassignment notices on release / reclaim
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

-- One-time cleanup for youths already reclaimed after a reassignment request
UPDATE public.reassignment_requests rr
SET status = 'closed'
FROM public.youth_profiles yp
WHERE rr.youth_id = yp.id
  AND rr.status = 'pending'
  AND rr.requested_by = 'youth'
  AND yp.updated_at > rr.created_at;
