-- CareBridge AI schedule & consultation schema

CREATE TABLE IF NOT EXISTS public.staff_schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  youth_id UUID REFERENCES public.youth_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS public.staff_schedule_day_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, note_date)
);

CREATE TABLE IF NOT EXISTS public.youth_free_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (youth_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID NOT NULL REFERENCES public.youth_profiles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  staff_slot_id UUID REFERENCES public.staff_schedule_slots(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_schedule_slots_staff_date
  ON public.staff_schedule_slots(staff_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_youth_free_slots_youth_date
  ON public.youth_free_slots(youth_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_staff_status
  ON public.consultation_requests(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_youth
  ON public.consultation_requests(youth_id, status);

CREATE TRIGGER staff_schedule_slots_updated_at
  BEFORE UPDATE ON public.staff_schedule_slots
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER staff_schedule_day_notes_updated_at
  BEFORE UPDATE ON public.staff_schedule_day_notes
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER consultation_requests_updated_at
  BEFORE UPDATE ON public.consultation_requests
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.staff_schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedule_day_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth_free_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

-- Staff manages own schedule
CREATE POLICY staff_schedule_slots_staff_all ON public.staff_schedule_slots
  FOR ALL TO authenticated
  USING (staff_id = public.current_staff_profile_id())
  WITH CHECK (staff_id = public.current_staff_profile_id());

CREATE POLICY staff_schedule_slots_youth_select ON public.staff_schedule_slots
  FOR SELECT TO authenticated
  USING (
    staff_id IN (
      SELECT yp.assigned_staff_id FROM public.youth_profiles yp
      WHERE yp.id = public.current_youth_id()
    )
  );

CREATE POLICY staff_schedule_day_notes_staff_all ON public.staff_schedule_day_notes
  FOR ALL TO authenticated
  USING (staff_id = public.current_staff_profile_id())
  WITH CHECK (staff_id = public.current_staff_profile_id());

CREATE POLICY staff_schedule_day_notes_youth_select ON public.staff_schedule_day_notes
  FOR SELECT TO authenticated
  USING (
    staff_id IN (
      SELECT yp.assigned_staff_id FROM public.youth_profiles yp
      WHERE yp.id = public.current_youth_id()
    )
  );

-- Youth free slots
CREATE POLICY youth_free_slots_youth_all ON public.youth_free_slots
  FOR ALL TO authenticated
  USING (youth_id = public.current_youth_id())
  WITH CHECK (youth_id = public.current_youth_id());

CREATE POLICY youth_free_slots_staff_select ON public.youth_free_slots
  FOR SELECT TO authenticated
  USING (public.staff_can_manage_youth(youth_id));

-- Consultation requests
CREATE POLICY consultation_requests_youth_insert ON public.consultation_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    youth_id = public.current_youth_id()
    AND staff_id IN (
      SELECT assigned_staff_id FROM public.youth_profiles
      WHERE id = public.current_youth_id()
    )
  );

CREATE POLICY consultation_requests_youth_select ON public.consultation_requests
  FOR SELECT TO authenticated
  USING (youth_id = public.current_youth_id());

CREATE POLICY consultation_requests_youth_cancel ON public.consultation_requests
  FOR UPDATE TO authenticated
  USING (youth_id = public.current_youth_id() AND status = 'pending')
  WITH CHECK (youth_id = public.current_youth_id());

CREATE POLICY consultation_requests_staff_select ON public.consultation_requests
  FOR SELECT TO authenticated
  USING (staff_id = public.current_staff_profile_id());

CREATE POLICY consultation_requests_staff_update ON public.consultation_requests
  FOR UPDATE TO authenticated
  USING (
    staff_id = public.current_staff_profile_id()
    AND public.staff_can_manage_youth(youth_id)
  )
  WITH CHECK (staff_id = public.current_staff_profile_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_schedule_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_schedule_day_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_free_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.consultation_requests TO authenticated;
