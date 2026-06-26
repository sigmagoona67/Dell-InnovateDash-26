-- Close stale youth reassignment notices when a case is released or reclaimed.
-- Also allow staff to update assigned_workers rows (reactivate after pool reclaim).

DROP POLICY IF EXISTS assigned_workers_staff_update ON public.assigned_workers;
CREATE POLICY assigned_workers_staff_update ON public.assigned_workers
  FOR UPDATE TO authenticated
  USING (staff_id = public.current_staff_profile_id())
  WITH CHECK (staff_id = public.current_staff_profile_id());

GRANT UPDATE ON public.assigned_workers TO authenticated;

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
