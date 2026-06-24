-- CareBridge: delete ALL user data EXCEPT Lifei35 (youth) and Lifei36 (staff)
-- Run in InsForge → Database → SQL Editor
-- Does NOT change schema or app code. Does NOT delete auth.users (see Step D).
--
-- Run each section in order. Check Step A & B before Step C.

-- =============================================================================
-- Step A: Accounts to KEEP (must show Lifei35 + Lifei36 only)
-- =============================================================================
SELECT
  p.id AS profile_id,
  p.email,
  p.display_name,
  p.role,
  yp.id AS youth_id,
  yp.preferred_name,
  yp.assignment_status
FROM public.profiles p
LEFT JOIN public.youth_profiles yp ON yp.user_id = p.id
WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
   OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
   OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
   OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
   OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
ORDER BY p.role, p.display_name;

-- =============================================================================
-- Step B: Accounts that WILL BE DELETED (review before continuing)
-- =============================================================================
SELECT
  p.id AS profile_id,
  p.email,
  p.display_name,
  p.role
FROM public.profiles p
WHERE p.id NOT IN (
  SELECT p2.id
  FROM public.profiles p2
  LEFT JOIN public.youth_profiles yp ON yp.user_id = p2.id
  WHERE lower(coalesce(p2.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p2.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p2.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p2.email, '')) LIKE '%lifei36%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
)
ORDER BY p.role, p.display_name;

-- =============================================================================
-- Step C: Delete app data (run the whole block below)
-- =============================================================================

-- Youth-linked rows (non-kept youth only)
DELETE FROM public.ai_messages
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
);

DELETE FROM public.ai_chat_sessions
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
);

DELETE FROM public.youth_questionnaire
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
);

DELETE FROM public.offline_counselling_sessions
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
);

DELETE FROM public.ai_dynamic_insights
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
);

DELETE FROM public.youth_free_slots
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
);

-- Mixed youth + staff rows
DELETE FROM public.consultation_requests
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
)
OR staff_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
);

DELETE FROM public.staff_youth_views
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
)
OR staff_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
);

DELETE FROM public.assigned_workers
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
)
OR staff_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
);

DELETE FROM public.reassignment_requests
WHERE youth_id NOT IN (
  SELECT yp.id
  FROM public.youth_profiles yp
  JOIN public.profiles p ON p.id = yp.user_id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
)
OR requester_profile_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
)
OR (
  assigned_staff_id IS NOT NULL
  AND assigned_staff_id NOT IN (
    SELECT p.id
    FROM public.profiles p
    WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
       OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
       OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
       OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
  )
);

-- Staff-only rows
DELETE FROM public.staff_schedule_slots
WHERE staff_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
);

DELETE FROM public.staff_schedule_day_notes
WHERE staff_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
);

-- Optional staff tables (safe if missing — ignore errors or comment out if table absent)
DELETE FROM public.staff_questionnaire
WHERE staff_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
);

DELETE FROM public.staff_profiles
WHERE profile_id NOT IN (
  SELECT p.id
  FROM public.profiles p
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
);

-- Remove all other app profiles (cascades youth_profiles for deleted users)
DELETE FROM public.profiles
WHERE id NOT IN (
  SELECT p.id
  FROM public.profiles p
  LEFT JOIN public.youth_profiles yp ON yp.user_id = p.id
  WHERE lower(coalesce(p.display_name, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.display_name, '')) LIKE '%lifei36%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei35%'
     OR lower(coalesce(p.email, '')) LIKE '%lifei36%'
     OR lower(coalesce(yp.preferred_name, '')) LIKE '%lifei35%'
);

-- =============================================================================
-- Step C2: Verify — should only show Lifei35 / Lifei36
-- =============================================================================
SELECT id, email, display_name, role FROM public.profiles ORDER BY role, display_name;

SELECT yp.id, yp.preferred_name, yp.assignment_status, p.display_name AS profile_name
FROM public.youth_profiles yp
JOIN public.profiles p ON p.id = yp.user_id
ORDER BY yp.preferred_name;

-- =============================================================================
-- Step D (manual, InsForge Dashboard):
-- Authentication → Users → delete every account EXCEPT Lifei35 & Lifei36 logins
-- SQL cannot remove auth.users from here.
-- =============================================================================
