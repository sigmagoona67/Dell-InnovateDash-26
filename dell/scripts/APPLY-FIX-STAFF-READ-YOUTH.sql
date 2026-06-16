-- Run in InsForge SQL Editor if staff Profile does not update after youth AI chat.
-- Fixes staff_can_read_youth blocking ai_messages when onboarding_completed is false.

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

SELECT 'staff_can_read_youth updated' AS status;
