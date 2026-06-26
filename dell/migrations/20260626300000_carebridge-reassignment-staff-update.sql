-- Allow staff to close reassignment notifications after releasing a case,
-- or when reclaiming an unassigned youth from the pool (fresh assignment).

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

GRANT UPDATE ON public.reassignment_requests TO authenticated;
