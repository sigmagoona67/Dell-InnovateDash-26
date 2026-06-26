# Deploy CareBridge full stack to Kubernetes (microservices + HPA + observability).
# Usage: .\scripts\k8s-deploy.ps1 [-Minikube] [-ApiUrl "http://localhost:3001"]

param(
    [switch]$Minikube,
    [string]$ApiUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Read-DotEnv {
    param([string]$Path)
    $vars = @{}
    if (-not (Test-Path $Path)) { return $vars }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        if ($line -match '^\s*([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            $vars[$key] = $val
        }
    }
    return $vars
}

Write-Host "==> Fixing kubectl TLS for Docker Desktop (if needed)..." -ForegroundColor Cyan
kubectl config set-cluster docker-desktop --insecure-skip-tls-verify=true 2>$null

Write-Host "==> Building Docker images..." -ForegroundColor Cyan
docker compose build carebridge-web carebridge-api
if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }

if ($Minikube) {
    Write-Host "==> Loading images into Minikube..." -ForegroundColor Cyan
    minikube image load carebridge-ai:local
    minikube image load carebridge-backend:local
    if ($LASTEXITCODE -ne 0) { throw "minikube image load failed" }
}

$envFile = Join-Path $Root ".env"
$envLocal = Join-Path $Root ".env.local"
$vars = Read-DotEnv $envFile
$localVars = Read-DotEnv $envLocal
foreach ($k in $localVars.Keys) { $vars[$k] = $localVars[$k] }

$jwtSecret = if ($vars["JWT_SECRET"]) { $vars["JWT_SECRET"] } else { "carebridge-dev-jwt-secret-change-in-production" }
$serviceKey = if ($vars["SERVICE_API_KEY"]) { $vars["SERVICE_API_KEY"] } else { "carebridge-service-key" }
$openrouterKey = if ($vars["OPENROUTER_API_KEY"]) { $vars["OPENROUTER_API_KEY"] } else { "" }
$dbUrl = if ($vars["DATABASE_URL"]) { $vars["DATABASE_URL"] } else { "postgresql://carebridge:carebridge@carebridge-postgres:5432/carebridge" }
$resolvedApiUrl = if ($vars["VITE_API_URL"]) { $vars["VITE_API_URL"] } else { $ApiUrl }

Write-Host "==> Applying Kubernetes manifests (Kustomize)..." -ForegroundColor Cyan
kubectl apply -f k8s/namespace.yaml

Write-Host "==> Creating Secrets (required before microservices start)..." -ForegroundColor Cyan
kubectl create secret generic carebridge-backend-secrets `
    --namespace carebridge `
    --from-literal=JWT_SECRET=$jwtSecret `
    --from-literal=SERVICE_API_KEY=$serviceKey `
    --from-literal=OPENROUTER_API_KEY=$openrouterKey `
    --from-literal=DATABASE_URL=$dbUrl `
    --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -k k8s/

Write-Host "==> Patching ConfigMap from .env..." -ForegroundColor Cyan
kubectl create configmap carebridge-config `
    --namespace carebridge `
    --from-literal=VITE_API_URL=$resolvedApiUrl `
    --from-literal=REDIS_URL=redis://carebridge-redis:6379 `
    --from-literal=DATABASE_URL=$dbUrl `
    --from-literal=OPENROUTER_CHAT_MODEL=openai/gpt-4o `
    --from-literal=JWT_EXPIRES_IN=7d `
    --from-literal=EVENT_STREAM_KEY=carebridge:events `
    --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout status statefulset/carebridge-postgres -n carebridge --timeout=180s 2>$null
kubectl rollout status deployment/carebridge-redis -n carebridge --timeout=120s
kubectl rollout status deployment/carebridge-gateway -n carebridge --timeout=180s
kubectl rollout status deployment/carebridge-web -n carebridge --timeout=120s

Write-Host "==> Running DB init job..." -ForegroundColor Cyan
kubectl delete job carebridge-db-init -n carebridge --ignore-not-found
kubectl apply -f k8s/db-init-job.yaml
kubectl wait --for=condition=complete job/carebridge-db-init -n carebridge --timeout=180s 2>$null

Write-Host ""
  Write-Host "Done. CareBridge microservices are on Kubernetes." -ForegroundColor Green
  Write-Host ""
  Write-Host "IMPORTANT — For the latest frontend (no InsForge), use Docker Compose web:" -ForegroundColor Yellow
  Write-Host "  `$env:APP_PORT='8888'; docker compose up -d carebridge-web carebridge-api"
  Write-Host "  Open http://localhost:8888/  (API at http://localhost:3001)"
  Write-Host ""
  Write-Host "K8s web (may cache old image on Docker Desktop):" -ForegroundColor Cyan
Write-Host "  Web:     kubectl port-forward -n carebridge svc/carebridge-web 9080:8080"
Write-Host "  API:     kubectl port-forward -n carebridge svc/carebridge-gateway 3001:3001"
Write-Host "  Then:    http://localhost:9080/  (API at $resolvedApiUrl)"
Write-Host "  Health:  curl http://localhost:3001/health"
Write-Host "  Metrics: curl http://localhost:3001/metrics"
Write-Host "  Prom:    kubectl port-forward -n carebridge svc/prometheus 9090:9090"
Write-Host ""
Write-Host "Docs: ARCHITECTURE.md | kubectl get pods -n carebridge"
