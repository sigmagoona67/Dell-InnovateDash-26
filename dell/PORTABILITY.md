# CareBridge — Portability Evidence

**Portability** here means: the same application artifacts run in multiple environments with only configuration changes — not that you must deploy to AWS, Azure, and GCP simultaneously.

## What stays the same (universal)

| Artifact | Path |
|----------|------|
| React frontend | `src/` |
| Backend microservices | `backend/services/` |
| Docker images | `Dockerfile`, `Dockerfile.backend` |
| Kubernetes manifests | `k8s/` |
| Helm chart | `helm/carebridge/` |

## What changes per environment

| Variable | Local Compose | Local K8s | Cloud K8s |
|----------|---------------|-----------|-----------|
| `DATABASE_URL` | postgres container | in-cluster Postgres / RDS | Terraform managed DB |
| `VITE_API_URL` | localhost:3001 | port-forward / LB URL | Gateway LoadBalancer URL |
| Container images | `*:local` build | `*:local` or GHCR | `ghcr.io/...` |
| Terraform | not used | not used | `terraform/aws` or azure/gcp |

## Proof without triple-cloud deploy

### Evidence 1 — Same app, three runtimes

```powershell
# Runtime A: Docker Compose
docker compose up -d --build
curl http://localhost:3001/health

# Runtime B: Kubernetes (local)
.\scripts\k8s-deploy.ps1
kubectl get pods -n carebridge

# Runtime C: Cloud K8s (optional)
# See CLOUD_DEPLOY.md — one LoadBalancer URL is enough
```

### Evidence 2 — Terraform validates on all clouds

```bash
cd dell/terraform/aws && terraform init && terraform validate
cd ../azure && terraform init && terraform validate
cd ../gcp && terraform init && terraform validate
```

Screenshot these for your report.

### Evidence 3 — Cloud overlay uses GHCR images only

`k8s/overlays/cloud/kustomization.yaml` swaps image names; **application YAML is unchanged**.

## Multi-cloud Terraform meaning

```
terraform/aws/    → creates EKS + RDS
terraform/azure/  → creates AKS + PostgreSQL
terraform/gcp/    → creates GKE + Cloud SQL

helm + k8s/       → identical on all three
```

## Report paragraph (English)

> CareBridge demonstrates portability by shipping the same container images and Kubernetes manifests across Docker Compose, local Kubernetes, and cloud-managed Kubernetes. Infrastructure is parameterized via Terraform modules for AWS, Azure, and GCP; switching clouds changes only Terraform roots and secrets such as DATABASE_URL, not application source code. We validated deployment on [Compose + K8s / AWS EKS] and verified Azure/GCP Terraform configurations with `terraform validate`.
