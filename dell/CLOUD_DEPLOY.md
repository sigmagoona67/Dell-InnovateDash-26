# Deploy CareBridge to a public cloud URL

This guide covers **Continuous Delivery** to Kubernetes with **LoadBalancer public URLs** (web + API).

## Architecture

```
Internet
   │
   ├─► carebridge-web (LoadBalancer :8080)     ← browser
   └─► carebridge-gateway (LoadBalancer :3001) ← API (VITE_API_URL)
```

Same `k8s/` manifests work locally and on EKS/AKS/GKE. Cloud overlay: `k8s/overlays/cloud/`.

## Option A — GitHub Actions CD (recommended)

### 1. Build cluster (one cloud)

```bash
cd dell/terraform/aws   # or azure / gcp
cp terraform.tfvars.example terraform.tfvars
# edit db_password
terraform init && terraform apply
```

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name carebridge   # example
```

### 3. GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `KUBE_CONFIG_BASE64` | `cat ~/.kube/config \| base64 -w0` |
| `DATABASE_URL` | Terraform output (managed RDS) or in-cluster Postgres |
| `JWT_SECRET` | Strong random string |
| `OPENROUTER_API_KEY` | Optional AI |

### 4. Push to `main` / `lifei`

1. **CI** workflow: build + test + push images to GHCR  
2. **CD** workflow: `kubectl apply -k k8s/overlays/cloud` + patch `VITE_API_URL`

### 5. Get public URLs

```bash
kubectl get svc -n carebridge carebridge-web carebridge-gateway
```

Or read CD workflow log output.

## Option B — Manual deploy

```bash
cd dell
export GITHUB_REPOSITORY_OWNER=your-github-user
export IMAGE_TAG=latest
export BACKEND_IMAGE=ghcr.io/$GITHUB_REPOSITORY_OWNER/carebridge-backend:$IMAGE_TAG
export WEB_IMAGE=ghcr.io/$GITHUB_REPOSITORY_OWNER/carebridge-web:$IMAGE_TAG
chmod +x scripts/k8s-cloud-deploy.sh
./scripts/k8s-cloud-deploy.sh
```

## Observability after deploy

```bash
kubectl port-forward -n carebridge svc/grafana 3000:3000
kubectl port-forward -n carebridge svc/prometheus 9090:9090
kubectl port-forward -n carebridge svc/jaeger 16686:16686
```

See `k8s/monitoring/OBSERVABILITY.md` for LogQL / PromQL queries.

## Cost note

EKS/GKE control planes have fixed monthly cost. For demos, Docker Desktop Kubernetes + LoadBalancer also works (localhost mapping).

## Portability evidence

See `PORTABILITY.md` — you do **not** need to deploy to three clouds; one cloud + Compose + K8s is sufficient proof.
