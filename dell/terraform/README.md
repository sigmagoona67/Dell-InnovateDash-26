# CareBridge Terraform — Multi-Cloud Infrastructure

Portable infrastructure-as-code for deploying CareBridge on managed Kubernetes + managed PostgreSQL.

## Layout

```
terraform/
├── aws/                    # EKS + RDS PostgreSQL (full)
├── azure/                  # AKS + Azure PostgreSQL Flexible Server (full)
└── gcp/                    # GKE + Cloud SQL PostgreSQL (full)
```

## Design

- **Compute:** Managed Kubernetes (EKS/AKS/GKE) — same Helm chart / K8s manifests in all clouds.
- **Database:** Managed PostgreSQL per cloud — state externalized from pods.
- **Secrets:** `DATABASE_URL` injected via K8s Secret after `terraform apply`.
- **Portability:** Only cloud provider blocks differ; application YAML is identical.

## AWS quick start

```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars
# edit region, cluster_name
terraform init
terraform apply
```

Outputs include `database_url`, `eks_cluster_name`, and `helm_install_command`.

## Azure / GCP

See `terraform/azure/README.md` and `terraform/gcp/README.md` for provider-specific variables. The application Helm values are the same — only `DATABASE_URL` and ingress hostname change.

## Post-apply

```bash
aws eks update-kubeconfig --name <cluster_name>
kubectl create secret generic carebridge-backend-secrets \
  --namespace carebridge \
  --from-literal=DATABASE_URL="<from terraform output>" \
  --from-literal=JWT_SECRET="<strong secret>"
helm upgrade --install carebridge ../helm/carebridge -n carebridge --create-namespace
```

## Cost notes

- RDS `db.t4g.micro` / equivalent for dev; scale instance class for prod.
- EKS control plane has fixed monthly cost; use HPA to right-size node groups.
- AI cost dominates at runtime (OpenRouter) — infra stays lean with 2 web + 2 gateway replicas minimum.
