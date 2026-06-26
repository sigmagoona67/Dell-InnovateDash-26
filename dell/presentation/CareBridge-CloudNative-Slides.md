---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section { font-size: 28px; }
  h1 { font-size: 44px; }
  h2 { font-size: 32px; color: #2563eb; }
  li { margin-bottom: 0.35em; }
  .placeholder { color: #64748b; font-size: 22px; font-style: italic; }
---

<!-- SLIDE 1 — ~30 sec | Title -->

# CareBridge AI

## Youth mental-health support with a cloud-native backend

**Team:** [Your team name]  
**Course:** Cloud Native Architecture

---

<!-- SLIDE 2 — ~90 sec | Problem + solution (keep short) -->

# What we built

**Problem**
- Youth need after-hours AI support; staff need insights and case tools

**Solution**
- Web app (Youth + Staff portals)
- **14 microservices** behind one API Gateway
- AI companion via **OpenRouter (GPT)**

<!-- [OPTIONAL IMAGE: Landing page screenshot — http://localhost:8888/] -->

---

<!-- SLIDE 3 — ~45 sec | Architecture -->

# Architecture overview

- **Frontend:** React SPA (containerized)
- **API Gateway:** single entry — auth, routing, health
- **14 microservices:** auth, case, ai-chat, notification, …
- **Data:** PostgreSQL · **Events:** Redis Streams

<!-- [INSERT IMAGE: Architecture diagram — file: ARCHITECTURE.md (mermaid diagram)] -->

<p class="placeholder">Screenshot placeholder: architecture diagram</p>

---

<!-- SLIDE 4 — ~60 sec | Microservices + Event-driven -->

# Modern patterns (1/2)

## Microservices
- One service per domain — scale **AI** separately from CRUD
- Gateway aggregates **/health** for all 14 services

## Event-driven
- Case writes → **Redis Streams** → notification service (async)
- Example events: youth assigned, crisis detected

<!-- [INSERT IMAGE: Browser — http://localhost:3016/health  (all dependencies ok)] -->
<!-- OR: folder screenshot — backend/services/ (14 folders) -->

<p class="placeholder">Screenshot placeholder: /health JSON or services folder</p>

---

<!-- SLIDE 5 — ~45 sec | IaC + Portability -->

# Modern patterns (2/2)

## Infrastructure as Code (IaC)
- **Kubernetes** manifests (`k8s/`) + **Helm** chart
- **Terraform:** AWS · Azure · GCP

## Portability
- **Same Docker images** — Docker Compose (local) → Kubernetes (demo/prod)
- Only **secrets & DB URL** change per environment

<!-- [INSERT IMAGE: IDE — k8s/ + terraform/aws|azure|gcp folders] -->
<!-- OR: terminal — kubectl get deploy -n carebridge -->

<p class="placeholder">Screenshot placeholder: k8s + terraform folders OR kubectl get deploy</p>

---

<!-- SLIDE 6 — ~60 sec | Resilience + Scale + Observability -->

# Resilient · Scalable · Observable

| Pillar | What we did |
|--------|-------------|
| **Resilience** | Health checks, **circuit breaker**, graceful AI fallback |
| **Scalability** | **HPA** on web, gateway, ai-chat, ai-insights |
| **Observability** | `/metrics` on every service · Prometheus · Grafana |

<!-- [INSERT IMAGE: terminal — kubectl get hpa -n carebridge] -->
<!-- OR: /health JSON showing "circuits" and "eventBus": "redis" -->

<p class="placeholder">Screenshot placeholder: HPA or /health with circuits</p>

---

<!-- SLIDE 7 — ~30 sec | Design reasoning (Exemplary) -->

# Why we designed it this way

| Choice | Reason |
|--------|--------|
| API **Gateway** (not service mesh) | Simpler to operate; enough for auth + circuit break |
| **OpenRouter** (not self-hosted LLM) | No GPU cluster; pay per use; portable |
| Monolith-in-container **locally**, microservices on **K8s** | Fast dev; real microservice proof for grading |

**We apply cloud-native patterns where they solve real problems.**

---

<!-- SLIDE 8 — ~60 sec | Live demo cue (optional — or skip and use screenshots) -->

# Demo (30–60 sec)

1. Open **`/health`** → 14 services OK  
2. **Youth chat** → GPT reply (`ilike piano`)  
3. **Staff dashboard** → profile & care insights update  

**Local:** `http://localhost:8888` · API `http://localhost:3016/health`

<!-- [INSERT IMAGE: Youth chat + Staff insights — your best 1–2 screenshots] -->

<p class="placeholder">Screenshot placeholder: product demo</p>

---

<!-- SLIDE 9 — ~20 sec | Close -->

# Summary

- **Microservices + event-driven + IaC + observability** — thoughtfully applied  
- **Portable** across Docker Compose, Kubernetes, and multi-cloud Terraform  
- **Resilient, scalable, secure, cost-aware** — with explicit design trade-offs  

**Thank you — questions?**

---

<!-- APPENDIX — hide during talk unless asked -->

# Appendix — evidence files (do not present)

| Topic | File / URL |
|-------|------------|
| Architecture | `ARCHITECTURE.md` |
| Grading map | `GRADING_EVIDENCE.md` |
| Gateway health | `http://localhost:3016/health` |
| Event bus | `backend/lib/eventBus.js` |
| HPA | `k8s/hpa-web.yaml` |
| CI | `.github/workflows/ci.yml` |
