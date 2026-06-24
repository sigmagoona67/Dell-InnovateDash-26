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
DROP POLICY IF EXISTS consultation_requests_staff_insert ON public.consultation_requests;

CREATE POLICY consultation_requests_staff_insert ON public.consultation_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    staff_id = public.current_staff_profile_id()
    AND public.staff_can_manage_youth(youth_id)
    AND initiated_by = 'staff'
  );

-- Staff can withdraw their own pending requests
DROP POLICY IF EXISTS consultation_requests_staff_withdraw ON public.consultation_requests;

CREATE POLICY consultation_requests_staff_withdraw ON public.consultation_requests
  FOR UPDATE TO authenticated
  USING (
    staff_id = public.current_staff_profile_id()
    AND status = 'pending'
    AND initiated_by = 'staff'
  )
  WITH CHECK (staff_id = public.current_staff_profile_id());

-- Either party can cancel an accepted meeting
DROP POLICY IF EXISTS consultation_requests_cancel_accepted_youth ON public.consultation_requests;

CREATE POLICY consultation_requests_cancel_accepted_youth ON public.consultation_requests
  FOR UPDATE TO authenticated
  USING (youth_id = public.current_youth_id() AND status = 'accepted')
  WITH CHECK (youth_id = public.current_youth_id());

DROP POLICY IF EXISTS consultation_requests_cancel_accepted_staff ON public.consultation_requests;

CREATE POLICY consultation_requests_cancel_accepted_staff ON public.consultation_requests
  FOR UPDATE TO authenticated
  USING (
    staff_id = public.current_staff_profile_id()
    AND status = 'accepted'
  )
  WITH CHECK (staff_id = public.current_staff_profile_id());
