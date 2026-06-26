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
