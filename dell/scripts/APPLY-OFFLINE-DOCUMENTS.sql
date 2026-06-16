-- Run in InsForge SQL Editor (optional but recommended for document file names)

ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_name TEXT;

ALTER TABLE public.offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS document_url TEXT;

SELECT 'offline document columns ready' AS status;
