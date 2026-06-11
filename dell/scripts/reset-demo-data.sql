-- CareBridge AI — reset demo / user data (keeps all table structures)
-- Run in InsForge: Database → Database Studio → SQL Editor
--
-- This script deletes rows from CareBridge app tables only.
-- It does NOT drop tables or alter schema.
-- It does NOT delete auth.users (InsForge Authentication accounts).
--
-- After running this script, delete auth users manually if needed:
-- InsForge Dashboard → Authentication → Users → delete each test account.

BEGIN;

-- 1. Leaf tables (no app-table dependents)
DELETE FROM public.ai_messages;

-- 2. Sessions and questionnaire
DELETE FROM public.ai_chat_sessions;
DELETE FROM public.youth_questionnaire;

-- 3. Staff portal data tied to youth
DELETE FROM public.offline_counselling_sessions;
DELETE FROM public.ai_dynamic_insights;
DELETE FROM public.staff_youth_views;

-- 4. Assignments
DELETE FROM public.assigned_workers;

-- 5. Youth profile rows (references profiles)
DELETE FROM public.youth_profiles;

-- 6. App user profiles (references auth.users; leaves auth accounts intact)
DELETE FROM public.profiles;

COMMIT;

-- Verify all app tables are empty:
SELECT 'ai_messages' AS table_name, COUNT(*) AS row_count FROM public.ai_messages
UNION ALL SELECT 'ai_chat_sessions', COUNT(*) FROM public.ai_chat_sessions
UNION ALL SELECT 'youth_questionnaire', COUNT(*) FROM public.youth_questionnaire
UNION ALL SELECT 'offline_counselling_sessions', COUNT(*) FROM public.offline_counselling_sessions
UNION ALL SELECT 'ai_dynamic_insights', COUNT(*) FROM public.ai_dynamic_insights
UNION ALL SELECT 'staff_youth_views', COUNT(*) FROM public.staff_youth_views
UNION ALL SELECT 'assigned_workers', COUNT(*) FROM public.assigned_workers
UNION ALL SELECT 'youth_profiles', COUNT(*) FROM public.youth_profiles
UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
ORDER BY table_name;
