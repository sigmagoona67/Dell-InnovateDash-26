# Deploy latest AI companion (ChatGPT + Morning Brief)
# Run in PowerShell from anywhere:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-ai-companion.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host ""
Write-Host "CareBridge AI deploy" -ForegroundColor Cyan
Write-Host "This pushes your NEW AI code to the cloud + adds the morning_brief database field." -ForegroundColor Gray
Write-Host ""

Write-Host "=== Step 1: Database (morning_brief column) ===" -ForegroundColor Cyan
npx @insforge/cli db import scripts/APPLY-MORNING-BRIEF.sql
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "CLI failed. Manual option:" -ForegroundColor Yellow
  Write-Host "  1. Open InsForge dashboard -> SQL Editor" -ForegroundColor Yellow
  Write-Host "  2. Copy ALL text from scripts/APPLY-MORNING-BRIEF.sql and Run" -ForegroundColor Yellow
  Write-Host "  3. Re-run this script" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "=== Step 2: Deploy youth-ai-chat (ChatGPT, longer replies, sync) ===" -ForegroundColor Cyan
npx @insforge/cli functions deploy youth-ai-chat `
  --file functions/youth-ai-chat.ts `
  --name "Youth AI Chat" `
  --description "After-hours ChatGPT companion with staff sync and morning brief"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed. Check you are linked: npx @insforge/cli link" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host "Test: youth sends an AI message -> staff refreshes Youth Overview -> see Morning Brief" -ForegroundColor Green
