# Fix kubectl "certificate signed by unknown authority" after Docker Desktop K8s recreate.
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\fix-kubeconfig.ps1

$ErrorActionPreference = "Stop"

Write-Host "==> CareBridge: fix kubectl / Docker Desktop Kubernetes" -ForegroundColor Cyan

# 1. Clear KUBECONFIG override (can point to stale file)
if ($env:KUBECONFIG) {
  Write-Host "Removing KUBECONFIG override: $env:KUBECONFIG"
  Remove-Item Env:KUBECONFIG
}

$kubeDir = Join-Path $env:USERPROFILE ".kube"
$config = Join-Path $kubeDir "config"
$backup = Join-Path $kubeDir ("config.backup." + (Get-Date -Format "yyyyMMdd-HHmmss"))

if (Test-Path $config) {
  Copy-Item $config $backup
  Write-Host "Backed up old config to: $backup"
}

Write-Host "==> Fixing docker-desktop TLS (local Docker Desktop cert mismatch)..." -ForegroundColor Cyan
kubectl config set-cluster docker-desktop --insecure-skip-tls-verify=true 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Could not patch kubeconfig yet; continuing..." -ForegroundColor Yellow
}

$kindExe = Get-Command kind -ErrorAction SilentlyContinue
if ($kindExe) {
  Write-Host "==> Trying: kind get kubeconfig --name kind" -ForegroundColor Cyan
  $kindConfig = Join-Path $kubeDir "kind-config"
  kind get kubeconfig --name kind | Set-Content -Path $kindConfig -Encoding UTF8
  $env:KUBECONFIG = $kindConfig
  kubectl get nodes
  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS. Using kind kubeconfig at: $kindConfig" -ForegroundColor Green
    Write-Host "For this PowerShell session, KUBECONFIG is set. To persist:"
    Write-Host "  copy `"$kindConfig`" `"$config`""
    exit 0
  }
  Write-Host "kind kubeconfig did not work, trying next step..." -ForegroundColor Yellow
  Remove-Item Env:KUBECONFIG -ErrorAction SilentlyContinue
}

# 3. Remove stale docker-desktop kubeconfig so Docker can regenerate
if (Test-Path $config) {
  Write-Host "==> Removing stale $config" -ForegroundColor Cyan
  Remove-Item $config -Force
}

Write-Host ""
Write-Host "Manual steps (required):" -ForegroundColor Yellow
Write-Host "  1. Quit Docker Desktop completely (tray icon -> Quit)"
Write-Host "  2. Start Docker Desktop again"
Write-Host "  3. Wait until Kubernetes shows Active"
Write-Host "  4. Open a NEW PowerShell and run:  kubectl get nodes"
Write-Host ""
Write-Host "If still failing:"
Write-Host "  Docker Desktop -> Troubleshoot (bug icon) -> Reset Kubernetes cluster"
Write-Host "  Then Create cluster again, wait Active, run: kubectl get nodes"
Write-Host ""
Write-Host "Old config backup: $backup"
