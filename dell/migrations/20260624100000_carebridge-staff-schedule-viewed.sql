-- Track when staff last opened a youth's Schedule tab (clears meeting-response badges)

ALTER TABLE public.staff_youth_views
  ADD COLUMN IF NOT EXISTS last_schedule_viewed_at TIMESTAMPTZ;
