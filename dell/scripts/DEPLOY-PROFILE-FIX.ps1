# Deploy profile generation fix + apply RLS migrations for Lifei4 / all youth.
# Run from repo root in PowerShell.

Set-Location $PSScriptRoot\..

Write-Host "=== 1. Apply staff read/write RLS migrations ===" -ForegroundColor Cyan
npx.cmd @insforge/cli db query --file migrations/20260610600000_fix-staff-read-youth.sql
npx.cmd @insforge/cli db query --file migrations/20260610600000_staff-insights-write-pending-youth.sql

Write-Host "=== 2. Deploy edge functions ===" -ForegroundColor Cyan
npx.cmd @insforge/cli functions deploy youth-ai-chat --file functions/youth-ai-chat.ts
npx.cmd @insforge/cli functions deploy staff-ai-assist --file functions/staff-ai-assist.ts

Write-Host "=== 3. Verify Lifei4 row ===" -ForegroundColor Cyan
npx.cmd @insforge/cli db query "SELECT yp.preferred_name, i.overall_summary IS NOT NULL AS has_summary, i.dynamic_profile IS NOT NULL AS has_dynamic, i.updated_at FROM youth_profiles yp LEFT JOIN ai_dynamic_insights i ON i.youth_id = yp.id WHERE yp.preferred_name ILIKE 'lifei4'" --json

Write-Host "=== 4. Repair Lifei4 if still empty ===" -ForegroundColor Cyan
node scripts/invoke-repair-lifei4.mjs

Write-Host "Done. Open Lifei4 Profile page in staff portal (hard refresh Ctrl+Shift+R)." -ForegroundColor Green
