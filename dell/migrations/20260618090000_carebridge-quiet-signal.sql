-- CareBridge AI — The Quiet Signal (P2 backend persistence)
--
-- Persists the deterministic Quiet Signal drift snapshot onto each day's
-- ai_chat_sessions row. The score is computed in the youth-ai-chat edge function
-- (see functions/_shared/quietSignal.ts) after each youth message / mood check-in,
-- then written back to the youth's current-day session row.
--
-- The Quiet Signal is an ADDITIVE early-warning signal decoupled from acute
-- risk_alerts: it reads the trajectory of how a youth writes and engages over a
-- rolling window. Every column here traces back to an explainable signal.
--
-- NO new RLS is required: staff already read ai_chat_sessions of their assigned
-- (and pending/unassigned) youth via the existing `ai_chat_sessions_staff_select`
-- policy in 20260610330000_carebridge-staff-read-access.sql, which gates on
-- public.staff_can_read_youth(youth_id). Adding columns to an already-RLS-guarded
-- table inherits that protection, so staff can read these drift_* fields and youth
-- can read their own (ai_chat_sessions_select_own) without further changes.

ALTER TABLE public.ai_chat_sessions
  ADD COLUMN IF NOT EXISTS drift_score SMALLINT,
  ADD COLUMN IF NOT EXISTS drift_tier TEXT CHECK (drift_tier IN ('steady', 'watch', 'amber')),
  ADD COLUMN IF NOT EXISTS drift_signals JSONB,
  ADD COLUMN IF NOT EXISTS drift_computed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ai_chat_sessions.drift_score IS
  'The Quiet Signal: deterministic 0-100 drift score for this day, computed over a rolling ~14-day window of youth messages + mood check-ins.';
COMMENT ON COLUMN public.ai_chat_sessions.drift_tier IS
  'Quiet Signal tier derived from drift_score: steady (<30), watch (30-54), amber (>=55).';
COMMENT ON COLUMN public.ai_chat_sessions.drift_signals IS
  'Explainable "why" behind the drift score: array of fired signals { key, label, detail, contribution }.';
COMMENT ON COLUMN public.ai_chat_sessions.drift_computed_at IS
  'When the drift snapshot was last recomputed for this session row.';
