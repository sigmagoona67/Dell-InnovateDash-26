# One-click setup: AI Dynamic Insights table + youth-ai-chat deploy
# Run from project root:  powershell -ExecutionPolicy Bypass -File scripts/setup-dynamic-insights.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Step 1: Apply SQL (ai_dynamic_insights table + RLS) ===" -ForegroundColor Cyan
npx @insforge/cli db import scripts/APPLY-DYNAMIC-INSIGHTS.sql
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "CLI import failed. Open InsForge SQL Editor and paste the FULL contents of:" -ForegroundColor Yellow
  Write-Host "  scripts/APPLY-DYNAMIC-INSIGHTS.sql" -ForegroundColor Yellow
  Write-Host "Do NOT paste the file path — copy all SQL inside the file." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "=== Step 2: Deploy youth-ai-chat edge function ===" -ForegroundColor Cyan
npx @insforge/cli functions deploy youth-ai-chat `
  --file functions/youth-ai-chat.ts `
  --name "Youth AI Chat" `
  --description "AI companion with dynamic insights sync"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed. Check network/VPN and retry." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Step 3: Verify table exists ===" -ForegroundColor Cyan
npx @insforge/cli db query "SELECT COUNT(*) AS insight_rows FROM public.ai_dynamic_insights" --json

Write-Host ""
Write-Host "Done. Have youth send a new AI chat message, then refresh Staff Youth Detail." -ForegroundColor Green
