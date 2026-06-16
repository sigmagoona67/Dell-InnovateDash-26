-- Delete youth account "lifei12" and ALL related CareBridge data
-- Run in InsForge Dashboard → SQL Editor (paste this whole file, then Run)
--
-- Step A: Preview who will be deleted (check the result first)
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
WHERE p.display_name ILIKE '%lifei12%'
   OR p.email ILIKE '%lifei12%'
   OR yp.preferred_name ILIKE '%lifei12%';

-- Step B: Delete app data (only if Step A shows the correct person)
-- Run this ALONE in SQL Editor (no BEGIN/COMMIT — InsForge does not allow them)
DELETE FROM public.profiles
WHERE id IN (
  SELECT p.id
  FROM public.profiles p
  LEFT JOIN public.youth_profiles yp ON yp.user_id = p.id
  WHERE p.display_name ILIKE '%lifei12%'
     OR p.email ILIKE '%lifei12%'
     OR yp.preferred_name ILIKE '%lifei12%'
);

-- Step C: Verify gone from app tables
SELECT
  p.id AS profile_id,
  p.email,
  p.display_name
FROM public.profiles p
LEFT JOIN public.youth_profiles yp ON yp.user_id = p.id
WHERE p.display_name ILIKE '%lifei12%'
   OR p.email ILIKE '%lifei12%'
   OR yp.preferred_name ILIKE '%lifei12%';

-- Step D (manual, in InsForge Dashboard):
-- Authentication → Users → find lifei12@... → Delete
-- (SQL cannot remove auth.users from here; login account must be deleted in the UI)
