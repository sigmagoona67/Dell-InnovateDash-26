# CareBridge — AWS EKS public URL deploy (Windows)
# Usage:
#   .\scripts\aws-eks-public.ps1
#   .\scripts\aws-eks-public.ps1 -SkipTerraform
# See AWS_EKS_PUBLIC.md for details.

param(
    [switch]$SkipTerraform,
    [string]$Region = "ap-southeast-1",
    [string]$ClusterName = "carebridge",
    [string]$JwtSecret = "",
    [string]$OpenRouterKey = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $name"
    }
}

Require-Command aws
Require-Command docker
Require-Command kubectl
Require-Command terraform

$TfDir = Join-Path $Root "terraform\aws"
$TfVars = Join-Path $TfDir "terraform.tfvars"

if (-not $SkipTerraform) {
    if (-not (Test-Path $TfVars)) {
        Copy-Item (Join-Path $TfDir "terraform.tfvars.example") $TfVars
        throw "Created $TfVars — edit db_password, then re-run this script."
    }
    Write-Host "==> Terraform apply (15-25 min first time)..." -ForegroundColor Cyan
    Push-Location $TfDir
    terraform init -input=false
    if ($LASTEXITCODE -ne 0) { throw "terraform init failed" }
    terraform apply -auto-approve -input=false
    if ($LASTEXITCODE -ne 0) { throw "terraform apply failed" }
    Pop-Location
} else {
    Write-Host "==> Skipping Terraform (-SkipTerraform)" -ForegroundColor Yellow
}

Push-Location $TfDir
$Region = terraform output -raw aws_region 2>$null
if (-not $Region) { $Region = "ap-southeast-1" }
$ClusterName = terraform output -raw eks_cluster_name 2>$null
if (-not $ClusterName) { $ClusterName = "carebridge" }
$DatabaseUrl = terraform output -raw database_url
$EcrBackend = terraform output -raw ecr_backend_url
$EcrWeb = terraform output -raw ecr_web_url
Pop-Location

if (-not $DatabaseUrl) { throw "Could not read database_url from terraform output" }
if (-not $EcrBackend -or -not $EcrWeb) { throw "Could not read ECR URLs from terraform output" }

Write-Host "==> Configure kubectl for EKS $ClusterName ($Region)" -ForegroundColor Cyan
aws eks update-kubeconfig --name $ClusterName --region $Region
if ($LASTEXITCODE -ne 0) { throw "aws eks update-kubeconfig failed" }
kubectl get nodes

Write-Host "==> Login to ECR and push images" -ForegroundColor Cyan
$Account = aws sts get-caller-identity --query Account --output text
$EcrHost = "$Account.dkr.ecr.$Region.amazonaws.com"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrHost
if ($LASTEXITCODE -ne 0) { throw "ECR login failed" }

docker compose build carebridge-api carebridge-web
if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }

docker tag carebridge-backend:local "${EcrBackend}:latest"
docker tag carebridge-ai:local "${EcrWeb}:latest"
docker push "${EcrBackend}:latest"
docker push "${EcrWeb}:latest"
if ($LASTEXITCODE -ne 0) { throw "docker push failed" }

if (-not $JwtSecret) {
    $envFile = Join-Path $Root ".env.local"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*JWT_SECRET=(.*)$') { $JwtSecret = $matches[1].Trim().Trim('"').Trim("'") }
            if ($_ -match '^\s*OPENROUTER_API_KEY=(.*)$') { $OpenRouterKey = $matches[1].Trim().Trim('"').Trim("'") }
        }
    }
}
if (-not $JwtSecret) { $JwtSecret = "carebridge-prod-jwt-" + [guid]::NewGuid().ToString() }

Write-Host "==> Kubernetes secrets + config" -ForegroundColor Cyan
kubectl create namespace carebridge --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic carebridge-backend-secrets `
    --namespace carebridge `
    --from-literal=JWT_SECRET=$JwtSecret `
    --from-literal=SERVICE_API_KEY="carebridge-service-key" `
    --from-literal=OPENROUTER_API_KEY=$OpenRouterKey `
    --from-literal=DATABASE_URL=$DatabaseUrl `
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap carebridge-config `
    --namespace carebridge `
    --from-literal=VITE_API_URL="http://localhost:3001" `
    --from-literal=REDIS_URL="redis://carebridge-redis:6379" `
    --from-literal=DATABASE_URL=$DatabaseUrl `
    --from-literal=OPENROUTER_CHAT_MODEL="openai/gpt-4o" `
    --from-literal=JWT_EXPIRES_IN="7d" `
    --from-literal=EVENT_STREAM_KEY="carebridge:events" `
    --dry-run=client -o yaml | kubectl apply -f -

function Set-BackendImages([string]$Image) {
    $backendDeployments = @(
        @{ dep = 'carebridge-gateway'; container = 'gateway' },
        @{ dep = 'carebridge-auth'; container = 'auth' },
        @{ dep = 'carebridge-profile'; container = 'profile' },
        @{ dep = 'carebridge-onboarding'; container = 'onboarding' },
        @{ dep = 'carebridge-case'; container = 'case' },
        @{ dep = 'carebridge-reassignment'; container = 'reassignment' },
        @{ dep = 'carebridge-team'; container = 'team' },
        @{ dep = 'carebridge-ai-chat'; container = 'ai-chat' },
        @{ dep = 'carebridge-ai-insights'; container = 'ai-insights' },
        @{ dep = 'carebridge-offline'; container = 'offline' },
        @{ dep = 'carebridge-offline-summary'; container = 'offline-summary' },
        @{ dep = 'carebridge-scheduling'; container = 'scheduling' },
        @{ dep = 'carebridge-staff-edit'; container = 'staff-edit' },
        @{ dep = 'carebridge-storage'; container = 'storage' },
        @{ dep = 'carebridge-notification'; container = 'notification' }
    )
    foreach ($item in $backendDeployments) {
        kubectl set image "deployment/$($item.dep)" "$($item.container)=${Image}" -n carebridge 2>$null
    }
}

$OverlayDir = Join-Path $Root "k8s\overlays\aws-eks"
$KustFile = Join-Path $OverlayDir "kustomization.ecr.yaml"

@(
    "apiVersion: kustomize.config.k8s.io/v1beta1",
    "kind: Kustomization",
    "resources:",
    "  - ../cloud",
    "images:",
    "  - name: carebridge-backend",
    "    newName: $EcrBackend",
    "    newTag: latest",
    "  - name: carebridge-ai",
    "    newName: $EcrWeb",
    "    newTag: latest",
    "patches:",
    "  - path: delete-incluster-postgres.yaml",
    "  - path: patch-db-init-job.yaml"
) | Set-Content -Path $KustFile -Encoding utf8

Write-Host "==> Apply Kubernetes manifests (aws-eks + ECR images)" -ForegroundColor Cyan
kubectl apply -k $KustFile
if ($LASTEXITCODE -ne 0) { throw "kubectl apply failed" }

Write-Host "==> Ensure ECR images on all deployments" -ForegroundColor Cyan
kubectl set image deployment/carebridge-web "web=${EcrWeb}:latest" -n carebridge
Set-BackendImages "${EcrBackend}:latest"

Write-Host "==> Wait for Redis + Gateway rollouts" -ForegroundColor Cyan
kubectl rollout status deployment/carebridge-redis -n carebridge --timeout=300s
kubectl rollout status deployment/carebridge-gateway -n carebridge --timeout=600s

Write-Host "==> DB init job (RDS schema)" -ForegroundColor Cyan
kubectl delete job carebridge-db-init -n carebridge --ignore-not-found
kubectl apply -k $KustFile
Start-Sleep -Seconds 3
kubectl wait --for=condition=complete job/carebridge-db-init -n carebridge --timeout=300s 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "DB init may still be running — check: kubectl logs -n carebridge job/carebridge-db-init" -ForegroundColor Yellow
}

Write-Host "==> Waiting for LoadBalancer URLs (up to 5 min)..." -ForegroundColor Cyan
$GwAddr = $null
$WebAddr = $null
for ($i = 0; $i -lt 30; $i++) {
    $GwHost = kubectl get svc carebridge-gateway -n carebridge -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>$null
    $GwIp = kubectl get svc carebridge-gateway -n carebridge -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
    $WebHost = kubectl get svc carebridge-web -n carebridge -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>$null
    $WebIp = kubectl get svc carebridge-web -n carebridge -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
    if ($GwHost) { $GwAddr = $GwHost } elseif ($GwIp) { $GwAddr = $GwIp }
    if ($WebHost) { $WebAddr = $WebHost } elseif ($WebIp) { $WebAddr = $WebIp }
    if ($GwAddr -and $WebAddr) { break }
    Start-Sleep -Seconds 10
}

if ($GwAddr) {
    $ApiUrl = "http://${GwAddr}:3001"
    Write-Host "==> Patch VITE_API_URL = $ApiUrl" -ForegroundColor Cyan
    kubectl patch configmap carebridge-config -n carebridge --type merge -p "{`"data`":{`"VITE_API_URL`":`"$ApiUrl`"}}"
    kubectl rollout restart deployment/carebridge-web -n carebridge
    kubectl rollout status deployment/carebridge-web -n carebridge --timeout=300s
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " CareBridge PUBLIC URLs (AWS EKS)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host " Web:    http://${WebAddr}:8080"
Write-Host " API:    http://${GwAddr}:3001"
Write-Host " Health: http://${GwAddr}:3001/health"
Write-Host ""
Write-Host "When done demo: cd terraform\aws && terraform destroy" -ForegroundColor Yellow
Write-Host "Full docs: AWS_EKS_PUBLIC.md" -ForegroundColor Cyan
