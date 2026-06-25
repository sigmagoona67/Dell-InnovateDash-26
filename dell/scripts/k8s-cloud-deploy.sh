#!/usr/bin/env bash
# Patch cloud overlay images, apply manifests, set public API URL, print LoadBalancer URLs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAMESPACE="${K8S_NAMESPACE:-carebridge}"
OWNER="${GITHUB_REPOSITORY_OWNER:-REPLACE_OWNER}"
SHA="${IMAGE_TAG:-latest}"
BACKEND_IMAGE="${BACKEND_IMAGE:-ghcr.io/${OWNER}/carebridge-backend:${SHA}}"
WEB_IMAGE="${WEB_IMAGE:-ghcr.io/${OWNER}/carebridge-web:${SHA}}"

echo "==> Patching cloud overlay images"
cd "$ROOT/k8s/overlays/cloud"
kustomize edit set image "carebridge-backend=${BACKEND_IMAGE}"
kustomize edit set image "carebridge-ai=${WEB_IMAGE}"

echo "==> Applying Kubernetes manifests"
kubectl apply -k .

echo "==> Waiting for core rollouts"
kubectl rollout status deployment/carebridge-gateway -n "$NAMESPACE" --timeout=300s
kubectl rollout status deployment/carebridge-web -n "$NAMESPACE" --timeout=300s

echo "==> Waiting for LoadBalancer hostnames (up to 5 min)"
for i in $(seq 1 30); do
  GW_HOST=$(kubectl get svc carebridge-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  GW_IP=$(kubectl get svc carebridge-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
  WEB_HOST=$(kubectl get svc carebridge-web -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  WEB_IP=$(kubectl get svc carebridge-web -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
  GW_ADDR="${GW_HOST:-$GW_IP}"
  WEB_ADDR="${WEB_HOST:-$WEB_IP}"
  if [[ -n "$GW_ADDR" && -n "$WEB_ADDR" ]]; then
    break
  fi
  sleep 10
done

if [[ -n "${GW_ADDR:-}" ]]; then
  API_URL="http://${GW_ADDR}:3001"
  echo "==> Patching VITE_API_URL=$API_URL"
  kubectl patch configmap carebridge-config -n "$NAMESPACE" --type merge \
    -p "{\"data\":{\"VITE_API_URL\":\"${API_URL}\"}}"
  kubectl rollout restart deployment/carebridge-web -n "$NAMESPACE"
  kubectl rollout status deployment/carebridge-web -n "$NAMESPACE" --timeout=180s
fi

echo ""
echo "=== CareBridge public URLs ==="
echo "Web:     http://${WEB_ADDR:-pending}:8080"
echo "API:     http://${GW_ADDR:-pending}:3001"
echo "Health:  http://${GW_ADDR:-pending}:3001/health"
echo "Grafana: kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000"
echo "Jaeger:  kubectl port-forward -n $NAMESPACE svc/jaeger 16686:16686"
