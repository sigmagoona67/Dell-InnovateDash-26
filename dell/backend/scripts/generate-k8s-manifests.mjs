#!/usr/bin/env node
/**
 * Generates k8s/microservices.yaml — one Deployment+Service per backend microservice.
 * Run: node backend/scripts/generate-k8s-manifests.mjs
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.resolve(__dirname, '../../k8s/microservices.yaml')

const SERVICES = [
  { name: 'gateway', entry: 'gateway/server.js', port: 3001, replicas: 2, hpa: true },
  { name: 'auth', entry: 'services/auth/server.js', port: 3002, replicas: 2 },
  { name: 'profile', entry: 'services/profile/server.js', port: 3003, replicas: 1 },
  { name: 'onboarding', entry: 'services/onboarding/server.js', port: 3004, replicas: 1 },
  { name: 'case', entry: 'services/case/server.js', port: 3005, replicas: 2 },
  { name: 'reassignment', entry: 'services/reassignment/server.js', port: 3006, replicas: 1 },
  { name: 'team', entry: 'services/team/server.js', port: 3007, replicas: 1 },
  { name: 'ai-chat', entry: 'services/ai-chat/server.js', port: 3008, replicas: 2, hpa: true },
  { name: 'ai-insights', entry: 'services/ai-insights/server.js', port: 3009, replicas: 2, hpa: true },
  { name: 'offline', entry: 'services/offline/server.js', port: 3010, replicas: 1 },
  { name: 'offline-summary', entry: 'services/offline-summary/server.js', port: 3011, replicas: 1 },
  { name: 'scheduling', entry: 'services/scheduling/server.js', port: 3012, replicas: 1 },
  { name: 'staff-edit', entry: 'services/staff-edit/server.js', port: 3013, replicas: 1 },
  { name: 'storage', entry: 'services/storage/server.js', port: 3014, replicas: 1 },
  { name: 'notification', entry: 'services/notification/server.js', port: 3015, replicas: 1 },
]

const BACKEND_NAMES = SERVICES.filter((s) => s.name !== 'gateway').map((s) => s.name)

function hostEnvForGateway() {
  return BACKEND_NAMES.map((name) => {
    const key = `${name.toUpperCase().replace(/-/g, '_')}_SERVICE_HOST`
    const k8sName = `carebridge-${name}`
    return `            - name: ${key}\n              value: ${k8sName}`
  }).join('\n')
}

const TSX_SERVICES = new Set(['ai-chat', 'ai-insights', 'offline-summary'])

function manifest(svc) {
  const k8sName = `carebridge-${svc.name}`
  const isGateway = svc.name === 'gateway'
  const serviceType = isGateway ? 'LoadBalancer' : 'ClusterIP'
  const nodeCmd = TSX_SERVICES.has(svc.name)
    ? `["node", "--import", "tsx", "${svc.entry}"]`
    : `["node", "${svc.entry}"]`
  const envBlock = isGateway
    ? `${hostEnvForGateway()}
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: carebridge-config
                  key: REDIS_URL`
    : `            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: carebridge-config
                  key: REDIS_URL`

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${k8sName}
  namespace: carebridge
  labels:
    app.kubernetes.io/name: carebridge
    app.kubernetes.io/component: ${svc.name}
spec:
  replicas: ${svc.replicas}
  selector:
    matchLabels:
      app.kubernetes.io/name: carebridge
      app.kubernetes.io/component: ${svc.name}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: carebridge
        app.kubernetes.io/component: ${svc.name}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "${svc.port}"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: ${svc.name}
          image: carebridge-backend:local
          imagePullPolicy: IfNotPresent
          command: ${nodeCmd}
          ports:
            - name: http
              containerPort: ${svc.port}
          envFrom:
            - secretRef:
                name: carebridge-backend-secrets
            - configMapRef:
                name: carebridge-config
          env:
${envBlock}
          resources:
            requests:
              cpu: ${svc.hpa ? '200m' : '100m'}
              memory: ${svc.hpa ? '256Mi' : '128Mi'}
            limits:
              cpu: ${svc.hpa ? '1000m' : '500m'}
              memory: ${svc.hpa ? '512Mi' : '256Mi'}
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 20
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 8
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ${k8sName}
  namespace: carebridge
  labels:
    app.kubernetes.io/name: carebridge
    app.kubernetes.io/component: ${svc.name}
spec:
  type: ${serviceType}
  selector:
    app.kubernetes.io/name: carebridge
    app.kubernetes.io/component: ${svc.name}
  ports:
    - name: http
      port: ${svc.port}
      targetPort: http
---`
}

function hpa(svc) {
  const k8sName = `carebridge-${svc.name}`
  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${k8sName}
  namespace: carebridge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${k8sName}
  minReplicas: ${svc.replicas}
  maxReplicas: ${svc.hpa === true ? 8 : 4}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---`
}

const docs = SERVICES.map(manifest).join('\n')
const hpas = SERVICES.filter((s) => s.hpa || s.name === 'gateway').map(hpa).join('\n')

writeFileSync(outPath, `${docs}\n${hpas}\n`, 'utf8')
console.log(`Wrote ${outPath} (${SERVICES.length} services, ${SERVICES.filter((s) => s.hpa).length + 1} HPAs)`)
