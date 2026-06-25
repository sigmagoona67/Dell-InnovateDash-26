# CareBridge — Grading Evidence Sheet

Maps course **Cloud Native** slides + **Grading Criteria** to concrete files and demo commands.

## Grading Criteria (final slide)

| Requirement | Status | Evidence | Demo command |
|-------------|--------|----------|--------------|
| Adopts cloud-native principles (portability, scalability, efficiency, resiliency) | ✅ | `ARCHITECTURE.md`, microservices, HPA, circuit breaker | `kubectl get hpa -n carebridge` |
| Multi-cloud deployment (adaptability, robustness) | ✅ | `PORTABILITY.md` + Terraform ×3 + same K8s |

## CNCF Elements (course slides)

| Element | Status | File / path | Demo |
|---------|--------|-------------|------|
| **Containers** | ✅ | `Dockerfile`, `Dockerfile.backend`, `docker-compose.yml` | `docker compose build` |
| **Microservices** | ✅ | `backend/services/` (14), `k8s/microservices.yaml` | `kubectl get deploy -n carebridge` |
| **Declarative APIs** | ✅ | `k8s/`, `helm/carebridge/`, `terraform/` | `kubectl apply -k k8s/` |
| **Immutable infrastructure** | ✅ | Container image tags, no SSH deploy | `docker images carebridge-*` |
| **Service mesh** | ❌ | Gateway pattern instead | `backend/gateway/server.js` |

## Five Traits

| Trait | Status | Evidence |
|-------|--------|----------|
| Scalability | ✅ | HPA web/gateway/AI (`k8s/hpa-web.yaml`, `microservices.yaml`) |
| Loose coupling | ✅ | Redis Streams + 6 domain events (`eventBus.js`, `dataRouter.js`) |
| Resilience | ✅ | Circuit breaker (`circuitBreaker.js`), probes, NetworkPolicy |
| Manageability | ✅ | IaC, `k8s-deploy.ps1`, Helm chart |
| Observability | ✅ | Metrics + JSON logs + Loki + traceId + Grafana + Jaeger (`k8s/monitoring/`) |

## Key Focus Areas (DevOps / CD / Microservices / Containers)

| Area | Status | Evidence |
|------|--------|----------|
| Containers | ✅ | Docker Compose + K8s |
| Microservices | ✅ | 14 services + gateway |
| DevOps | ✅ | `.github/workflows/ci.yml` |
| Continuous Delivery | ✅ | `cd.yml` + `CLOUD_DEPLOY.md` + `k8s/overlays/cloud/` |

## Cloud Native AI (CNAI)

| Area | Status | Evidence |
|------|--------|----------|
| AI as microservices | ✅ | `ai-chat`, `ai-insights`, `offline-summary` |
| Repeatable deploy | ✅ | Same image, multiple entrypoints |
| Scalable AI workloads | ✅ | HPA on `carebridge-ai-chat`, `carebridge-ai-insights` |
| Model serving | ✅ | `functions/youth-ai-chat.ts`, invoke API |

## Multi-cloud Terraform

| Cloud | Status | Path |
|-------|--------|------|
| AWS | ✅ Full | `terraform/aws/main.tf` (EKS + RDS) |
| Azure | ✅ Full | `terraform/azure/main.tf` (AKS + PostgreSQL Flexible) |
| GCP | ✅ Full | `terraform/gcp/main.tf` (GKE + Cloud SQL) |

Post-apply (any cloud): same `helm upgrade --install carebridge ./helm/carebridge` + `kubectl apply -k k8s/`.

## 5-minute demo script

```powershell
# 1. Local full stack
cd dell
docker compose up -d --build
curl http://localhost:3001/health

# 2. Kubernetes microservices
.\scripts\k8s-deploy.ps1
kubectl get pods,hpa -n carebridge

# 3. Observability (metrics + logs + traces)
kubectl port-forward -n carebridge svc/grafana 3000:3000
kubectl port-forward -n carebridge svc/jaeger 16686:16686

# 4. Cloud CD (after GitHub secrets configured)
# See CLOUD_DEPLOY.md — public LoadBalancer URLs
```

## Report one-liner (English)

> CareBridge implements CNCF cloud-native patterns—containerized microservices, declarative IaC (K8s/Helm/Terraform on AWS/Azure/GCP), event-driven notifications, HPA autoscaling, circuit-breaker resilience, and Prometheus/Grafana observability—with AI workloads (`ai-chat`, `ai-insights`) deployed as independently scalable services.
