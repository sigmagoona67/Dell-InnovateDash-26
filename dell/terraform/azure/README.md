# Azure deployment (AKS + Azure Database for PostgreSQL)

Same application manifests as AWS/GCP — only Terraform provider blocks differ.

## Resources provisioned

- Resource group + VNet
- **AKS** cluster (`azurerm_kubernetes_cluster`)
- **PostgreSQL Flexible Server** 16 (`azurerm_postgresql_flexible_server`)

## Quick start

```bash
cd terraform/azure
cp terraform.tfvars.example terraform.tfvars
# edit db_password
terraform init
terraform apply
```

## Post-apply

```bash
terraform output kubectl_credentials_command
# run the printed az aks get-credentials command

kubectl create secret generic carebridge-backend-secrets \
  --namespace carebridge \
  --from-literal=DATABASE_URL="$(terraform output -raw database_url)" \
  --from-literal=JWT_SECRET="<strong secret>"

kubectl apply -k ../../k8s/
helm upgrade --install carebridge ../../helm/carebridge -n carebridge --create-namespace
```

**Portability:** `k8s/` and `helm/` are identical to AWS/GCP — only `DATABASE_URL` and ingress hostname change.
