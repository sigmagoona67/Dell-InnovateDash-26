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

DROP POLICY IF EXISTS youth_profiles_staff_assign ON public.youth_profiles;

CREATE POLICY youth_profiles_staff_assign ON public.youth_profiles
  FOR UPDATE TO authenticated
  USING (
    public.current_staff_profile_id() IS NOT NULL
    AND assigned_staff_id IS NULL
  )
  WITH CHECK (
    assigned_staff_id = public.current_staff_profile_id()
    AND assignment_status = 'assigned'
  );

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
