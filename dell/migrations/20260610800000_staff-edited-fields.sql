-- Staff manual edits on insights and session summaries feed future AI regen as sources.

ALTER TABLE ai_dynamic_insights
  ADD COLUMN IF NOT EXISTS staff_edited_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ai_chat_sessions
  ADD COLUMN IF NOT EXISTS staff_edited_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE offline_counselling_sessions
  ADD COLUMN IF NOT EXISTS staff_edited_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ai_dynamic_insights.staff_edited_fields IS
  'Map of field key -> ISO timestamp when staff last edited; edited values live in the main columns.';

COMMENT ON COLUMN ai_chat_sessions.staff_edited_fields IS
  'Tracks staff-edited session fields (e.g. ai_summary) for AI context on regen.';

COMMENT ON COLUMN offline_counselling_sessions.staff_edited_fields IS
  'Tracks staff-edited offline session fields for AI context on regen.';
