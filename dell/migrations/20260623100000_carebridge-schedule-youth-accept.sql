-- Allow youth to accept staff meeting requests (book worker slot + respond to request)

DROP POLICY IF EXISTS consultation_requests_youth_cancel ON public.consultation_requests;

CREATE POLICY consultation_requests_youth_respond ON public.consultation_requests
  FOR UPDATE TO authenticated
  USING (
    youth_id = public.current_youth_id()
    AND status IN ('pending', 'accepted')
  )
  WITH CHECK (youth_id = public.current_youth_id());

DROP POLICY IF EXISTS staff_schedule_slots_youth_book_meeting ON public.staff_schedule_slots;

CREATE POLICY staff_schedule_slots_youth_book_meeting ON public.staff_schedule_slots
  FOR INSERT TO authenticated
  WITH CHECK (
    youth_id = public.current_youth_id()
    AND status = 'booked'
    AND EXISTS (
      SELECT 1
      FROM public.consultation_requests cr
      WHERE cr.youth_id = public.current_youth_id()
        AND cr.staff_id = staff_schedule_slots.staff_id
        AND cr.slot_date = staff_schedule_slots.slot_date
        AND cr.start_time = staff_schedule_slots.start_time
        AND cr.status = 'pending'
        AND cr.initiated_by = 'staff'
    )
  );

DROP POLICY IF EXISTS staff_schedule_slots_youth_update_for_meeting ON public.staff_schedule_slots;

CREATE POLICY staff_schedule_slots_youth_update_for_meeting ON public.staff_schedule_slots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultation_requests cr
      WHERE cr.youth_id = public.current_youth_id()
        AND cr.staff_id = staff_schedule_slots.staff_id
        AND cr.slot_date = staff_schedule_slots.slot_date
        AND cr.start_time = staff_schedule_slots.start_time
        AND cr.status = 'pending'
        AND cr.initiated_by = 'staff'
    )
  )
  WITH CHECK (
    youth_id = public.current_youth_id()
    AND status = 'booked'
  );
