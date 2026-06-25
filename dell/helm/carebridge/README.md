# CareBridge Helm Chart

Packages CareBridge for **multi-cloud Kubernetes** (EKS, AKS, GKE). The chart values control image tags, replica counts, HPA, database URL, and secrets.

## Full stack deployment

The complete microservice manifests live in `k8s/` (Kustomize). Helm values align with `k8s/configmap.yaml` and secrets.

### Recommended flow

```bash
# 1. Build images
docker compose build

# 2. Push to your registry (cloud)
docker tag carebridge-ai:local ghcr.io/YOUR_ORG/carebridge-ai:1.0.0
docker tag carebridge-backend:local ghcr.io/YOUR_ORG/carebridge-backend:1.0.0
docker push ghcr.io/YOUR_ORG/carebridge-ai:1.0.0
docker push ghcr.io/YOUR_ORG/carebridge-backend:1.0.0

# 3. Create namespace + secrets from Helm values
helm upgrade --install carebridge ./helm/carebridge \
  -n carebridge --create-namespace \
  --set images.web=ghcr.io/YOUR_ORG/carebridge-ai:1.0.0 \
  --set images.backend=ghcr.io/YOUR_ORG/carebridge-backend:1.0.0 \
  --set database.url="postgresql://..." \
  --set secrets.jwtSecret="..." \
  -f helm/carebridge/values-prod.yaml

# 4. Apply K8s manifests (microservices, HPA, monitoring)
kubectl apply -k k8s/
```

### Local Kubernetes (Windows)

```powershell
.\scripts\k8s-deploy.ps1
```

## Values reference

| Key | Purpose |
|-----|---------|
| `images.web` / `images.backend` | Container images |
| `web.apiUrl` | Browser-facing API URL (`VITE_API_URL`) |
| `database.url` | Managed PostgreSQL connection string |
| `redis.url` | Redis Streams event bus |
| `gateway.hpa` | Autoscale API gateway on CPU |
| `aiChat.hpa` | Autoscale AI chat service |
| `monitoring.prometheus.enabled` | Prometheus scrape stack |

See `ARCHITECTURE.md` for design rationale.
