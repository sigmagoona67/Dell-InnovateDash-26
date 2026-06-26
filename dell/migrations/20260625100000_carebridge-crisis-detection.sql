-- Crisis detection flags for youth AI chat safety monitoring (staff dashboard visibility)

ALTER TABLE public.ai_chat_sessions
  ADD COLUMN IF NOT EXISTS crisis_detected BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS crisis_detected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_crisis_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ai_chat_sessions.crisis_detected IS
  'True when AI safety assessment detected high-risk / crisis-level content in this session.';

COMMENT ON COLUMN public.ai_dynamic_insights.crisis_detected IS
  'True when any youth AI chat session triggered crisis-level safety detection.';

COMMENT ON COLUMN public.ai_dynamic_insights.last_crisis_at IS
  'Timestamp of the most recent crisis-level AI chat detection for this youth.';
