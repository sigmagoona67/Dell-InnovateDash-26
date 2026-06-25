# Kubernetes — CareBridge full stack

CareBridge deploys as **cloud-native microservices** on any Kubernetes cluster (Docker Desktop, Minikube, EKS, AKS, GKE).

## Architecture

```
Browser → carebridge-web (×2, HPA) → carebridge-gateway (×2, HPA)
                                         ├── auth, profile, case, … (14 services)
                                         ├── Redis Streams (events)
                                         └── PostgreSQL (StatefulSet / managed RDS)
Prometheus scrapes /metrics on all services
```

See **[ARCHITECTURE.md](../ARCHITECTURE.md)** for design rationale and rubric mapping.

## Quick start (Windows)

```powershell
cd dell
docker compose build
.\scripts\k8s-deploy.ps1
# In two terminals:
kubectl port-forward -n carebridge svc/carebridge-web 9080:8080
kubectl port-forward -n carebridge svc/carebridge-gateway 3001:3001
# Open http://localhost:9080/
```

## What's included

| Manifest | Purpose |
|----------|---------|
| `microservices.yaml` | 15 Deployments (gateway + 14 services), Services, HPAs |
| `postgres.yaml` | StatefulSet (dev); use RDS/Cloud SQL in prod |
| `redis.yaml` | Event bus (Redis Streams) |
| `hpa-web.yaml` | Autoscale frontend |
| `network-policy.yaml` | Zero-trust pod ingress |
| `monitoring/prometheus.yaml` | Metrics collection |
| `monitoring/grafana.yaml` | Grafana + CareBridge dashboard |
| `monitoring/OBSERVABILITY.md` | Prometheus query examples |
| `db-init-job.yaml` | Schema bootstrap |

Regenerate microservices after changing ports/replicas:

```bash
node backend/scripts/generate-k8s-manifests.mjs
```

## Multi-cloud

1. Build and push images to your registry.
2. `terraform apply` in `terraform/aws` (or azure/gcp) for cluster + managed DB.
3. `helm upgrade --install carebridge ./helm/carebridge` + `kubectl apply -k k8s/`.

Only **secrets** and **DATABASE_URL** / **VITE_API_URL** change per cloud.

## Verify

```powershell
kubectl get pods -n carebridge
curl http://localhost:3001/health    # aggregated dependency health
curl http://localhost:3001/metrics   # Prometheus
kubectl port-forward -n carebridge svc/grafana 3000:3000
kubectl port-forward -n carebridge svc/prometheus 9090:9090
kubectl get hpa -n carebridge
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ImagePullBackOff` | `minikube image load carebridge-backend:local` |
| Gateway 503 | `kubectl logs -n carebridge -l app.kubernetes.io/component=gateway` |
| DB init failed | `kubectl logs -n carebridge job/carebridge-db-init` |
| HPA not scaling | Metrics server required: `kubectl get apiservice v1beta1.metrics.k8s.io` |
