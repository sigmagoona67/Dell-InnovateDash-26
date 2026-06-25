# CareBridge Microservices Backend

Standalone backend replacing InsForge. **14 microservices** + API Gateway + PostgreSQL.

## Architecture

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 3001 | Routes `/api/v1/*` to services |
| auth | 3002 | Signup, signin, JWT, profile role |
| profile | 3003 | `profiles`, `youth_profiles`, `staff_profiles` |
| onboarding | 3004 | Questionnaires |
| case | 3005 | Assignment, `assigned_workers`, views |
| reassignment | 3006 | `reassignment_requests` |
| team | 3007 | Staff directory |
| ai-chat | 3008 | Chat sessions/messages + `youth-ai-chat` AI |
| ai-insights | 3009 | `ai_dynamic_insights` |
| offline | 3010 | Offline counselling sessions |
| offline-summary | 3011 | `staff-ai-assist` AI summaries |
| scheduling | 3012 | Calendar, consultation requests |
| staff-edit | 3013 | Staff-edited fields |
| storage | 3014 | File uploads |
| notification | 3015 | Event notifications |

## Quick start (local)

```powershell
# 1. Postgres
docker compose up -d postgres

# 2. Backend deps + DB
cd backend
npm install
node scripts/build-init-sql.mjs
node scripts/init-db.mjs

# 3. Start all services
node scripts/start-all.mjs

# 4. Frontend (separate terminal, project root)
npm install
npm run dev
```

Frontend uses `VITE_API_URL` (default proxied via Vite to `http://localhost:3001`).

## Environment

Copy `.env.example` to `.env.local`:

```
VITE_API_URL=http://localhost:3001
DATABASE_URL=postgresql://carebridge:carebridge@localhost:5432/carebridge
JWT_SECRET=your-secret
OPENROUTER_API_KEY=sk-or-...
```

## Test

```powershell
cd backend
node scripts/integration-test.mjs
```

## Docker (full stack)

```powershell
docker compose up -d --build
```

Includes **Postgres**, **Redis** (event bus), API (all microservices), and web.

## Cloud-native deployment

| Path | Docs |
|------|------|
| Architecture & rubric | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| Kubernetes | [k8s/README.md](../k8s/README.md) |
| Helm | [helm/carebridge/README.md](../helm/carebridge/README.md) |
| Terraform (EKS/AKS/GCE) | [terraform/README.md](../terraform/README.md) |

**Production:** Each microservice runs as its own K8s Deployment; HPAs scale web, gateway, and AI services; Redis Streams powers event-driven notifications; Prometheus scrapes `/metrics`.
