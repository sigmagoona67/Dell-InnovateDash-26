-- Allow assigned staff to release a youth back to the unassigned pool

CREATE POLICY youth_profiles_staff_release ON public.youth_profiles
  FOR UPDATE TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND assigned_staff_id = public.current_staff_profile_id()
  )
  WITH CHECK (
    assigned_staff_id IS NULL
    AND assignment_status = 'pending'
  );
