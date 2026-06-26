ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_name TEXT;

ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_url TEXT;
