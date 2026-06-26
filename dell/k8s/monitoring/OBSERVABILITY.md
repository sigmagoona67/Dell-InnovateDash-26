# CareBridge Observability

Prometheus scrapes every microservice that exposes `prometheus.io/scrape: "true"` annotations. Grafana ships with a pre-built **CareBridge Overview** dashboard.

## Quick access (local K8s)

```powershell
kubectl port-forward -n carebridge svc/prometheus 9090:9090
kubectl port-forward -n carebridge svc/grafana 3000:3000
kubectl port-forward -n carebridge svc/loki 3100:3100
kubectl port-forward -n carebridge svc/jaeger 16686:16686
```

| URL | Purpose |
|-----|---------|
| http://localhost:9090 | Prometheus UI |
| http://localhost:3000 | Grafana (Prometheus + Loki + Jaeger datasources) |
| http://localhost:3100 | Loki API |
| http://localhost:16686 | Jaeger UI |
| http://localhost:3001/health | Gateway aggregated dependency health |
| http://localhost:3001/metrics | Gateway Prometheus metrics |

## Logs (Loki)

All services emit **structured JSON logs** via `backend/lib/logger.js` and `traceMiddleware.js`:

```json
{"ts":"...","level":"info","service":"gateway","msg":"request.end","traceId":"...","status":200,"durationMs":12}
```

### LogQL examples (Grafana → Explore → Loki)

```logql
{namespace="carebridge"} | json | service="gateway"
```

```logql
{namespace="carebridge"} | json | msg="request.end" | status >= 500
```

```logql
{namespace="carebridge"} | json | traceId="<paste-from-response-header>"
```

Promtail DaemonSet ships pod logs to Loki (`k8s/monitoring/promtail.yaml`).

## Traces (correlation + Jaeger)

Each HTTP request gets `x-trace-id` (response header). Logs include `traceId` + `spanId` for correlation.

Jaeger all-in-one UI: `kubectl port-forward -n carebridge svc/jaeger 16686:16686`

Search by service name in Jaeger when full OpenTelemetry instrumentation is added; today use **traceId in Loki** for request trail demo.

## Useful Prometheus queries

### Request throughput by service

```promql
sum(rate(carebridge_http_requests_total[5m])) by (service)
```

### P95 latency by service

```promql
histogram_quantile(
  0.95,
  sum(rate(carebridge_http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

### 5xx error rate

```promql
sum(rate(carebridge_http_requests_total{status=~"5.."}[5m])) by (service)
```

### AI route latency (ai-chat / ai-insights)

```promql
histogram_quantile(
  0.95,
  sum(rate(carebridge_http_request_duration_seconds_bucket{service=~"gateway|ai-chat|ai-insights"}[5m])) by (le, service)
)
```

### Scraped pods healthy

```promql
count(up{job="carebridge-kubernetes-pods"} == 1)
```

### Process memory per service (default Node metrics)

```promql
carebridge_process_resident_memory_bytes / 1024 / 1024
```

## Grafana dashboard panels

The ConfigMap `grafana-dashboard-carebridge` provisions:

1. HTTP request rate
2. P95 latency
3. 5xx error rate
4. Scraped targets up

## Metrics implementation

Every backend service calls `attachMetrics(app, serviceName)` from `backend/lib/metrics.js`, exposing:

- `carebridge_http_requests_total{service,method,route,status}`
- `carebridge_http_request_duration_seconds_bucket{...}`
- Default Node.js process metrics with `carebridge_` prefix

## CI/CD verification

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/ci.yml` | Build + integration test + Docker push to GHCR |
| `.github/workflows/cd.yml` | Deploy to K8s cloud overlay + public LoadBalancer |

See `CLOUD_DEPLOY.md` and `PORTABILITY.md`.

## Rubric alignment

| CNCF trait | Observability evidence |
|------------|------------------------|
| Observable | Metrics + JSON logs (Loki) + traceId + Grafana + Jaeger UI |
| Manageable | Aggregated `/health` with per-service status + circuit breaker state |
| Resilient | 5xx rate panel + circuit status in gateway `/health` |
