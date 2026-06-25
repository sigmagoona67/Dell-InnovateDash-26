# GCP deployment (GKE + Cloud SQL for PostgreSQL)

Same application manifests as AWS/Azure.

## Resources provisioned

- **GKE** cluster + node pool
- **Cloud SQL** PostgreSQL 16 instance

## Quick start

```bash
cd terraform/gcp
cp terraform.tfvars.example terraform.tfvars
# edit project_id and db_password
terraform init
terraform apply
```

## Post-apply

```bash
terraform output kubectl_credentials_command
# run the printed gcloud get-credentials command

kubectl create secret generic carebridge-backend-secrets \
  --namespace carebridge \
  --from-literal=DATABASE_URL="$(terraform output -raw database_url)" \
  --from-literal=JWT_SECRET="<strong secret>"

kubectl apply -k ../../k8s/
helm upgrade --install carebridge ../../helm/carebridge -n carebridge --create-namespace
```

**Cost:** GKE node pool + `db-f1-micro` for dev; HPA scales app pods independently.
