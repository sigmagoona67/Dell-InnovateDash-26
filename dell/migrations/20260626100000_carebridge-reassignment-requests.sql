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

ALTER TABLE public.reassignment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY reassignment_requests_youth_select ON public.reassignment_requests
  FOR SELECT TO authenticated
  USING (youth_id = public.current_youth_id());

CREATE POLICY reassignment_requests_youth_insert ON public.reassignment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = 'youth'
    AND requester_profile_id = public.current_profile_id()
    AND youth_id = public.current_youth_id()
  );

CREATE POLICY reassignment_requests_staff_select ON public.reassignment_requests
  FOR SELECT TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND youth_id IN (
      SELECT id FROM public.youth_profiles
      WHERE assigned_staff_id = public.current_staff_profile_id()
    )
  );

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

GRANT SELECT, INSERT ON public.reassignment_requests TO authenticated;
