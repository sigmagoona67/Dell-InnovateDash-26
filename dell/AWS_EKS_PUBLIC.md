# AWS EKS 公网部署指南（方案 A）

在 **AWS EKS** 上部署 CareBridge，获得真正的公网 URL（LoadBalancer）。

## 你会得到什么

| 地址 | 用途 |
|------|------|
| `http://<web-lb>:8080` | 浏览器打开网站 |
| `http://<gateway-lb>:3001` | API（自动写入 `VITE_API_URL`） |
| `http://<gateway-lb>:3001/health` | 健康检查 |

## 前置条件

1. **AWS 账号** + 已配置 AWS CLI（`aws configure`）
2. 已安装：**Terraform**、**kubectl**、**Docker Desktop**
3. 本机 RAM 建议 ≥ 8GB（`terraform apply` 约 15–25 分钟）

## 大概费用（新加坡区域 ap-southeast-1）

| 资源 | 约月费 |
|------|--------|
| EKS 控制面 | ~USD 72 |
| 2× t3.medium 节点 | ~USD 60 |
| RDS db.t4g.micro | ~USD 15 |
| NAT Gateway | ~USD 32 |
| LoadBalancer ×2 | ~USD 20 |

**演示完可 `terraform destroy` 删掉，避免持续扣费。**

---

## 一键部署（推荐）

```powershell
cd dell

# 1. 配置数据库密码（不要用默认）
copy terraform\aws\terraform.tfvars.example terraform\aws\terraform.tfvars
# 编辑 terraform\aws\terraform.tfvars → 改 db_password

# 2. 跑完整流程（Terraform + 推镜像 + K8s + 公网 URL）
.\scripts\aws-eks-public.ps1
```

脚本会自动：

1. `terraform apply` 创建 VPC、EKS、RDS、ECR  
2. `aws eks update-kubeconfig`  
3. `docker build` 并 **push 到 ECR**（EKS 不能用 `:local` 镜像）  
4. 用 **RDS** 作为 `DATABASE_URL`（不用集群内 Postgres）  
5. `kubectl apply -k k8s/overlays/aws-eks`  
6. 等待 LoadBalancer，patch `VITE_API_URL`，打印公网链接  

### 已有集群、只重新部署应用

```powershell
.\scripts\aws-eks-public.ps1 -SkipTerraform
```

---

## 手动分步（理解用）

### Step 1 — 基础设施

```powershell
cd dell\terraform\aws
terraform init
terraform apply
terraform output configure_kubectl
terraform output -raw database_url
```

### Step 2 — 连接集群

```powershell
aws eks update-kubeconfig --name carebridge --region ap-southeast-1
kubectl get nodes
```

### Step 3 — 推送镜像到 ECR

```powershell
$REGION = "ap-southeast-1"
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$ECR = "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR

cd dell
docker compose build carebridge-api carebridge-web
docker tag carebridge-backend:local "$ECR/carebridge-backend:latest"
docker tag carebridge-ai:local "$ECR/carebridge-web:latest"
docker push "$ECR/carebridge-backend:latest"
docker push "$ECR/carebridge-web:latest"
```

### Step 4 — Secrets + 部署

```powershell
$DB_URL = cd terraform\aws; terraform output -raw database_url; cd ..\..

kubectl create namespace carebridge --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic carebridge-backend-secrets `
  --namespace carebridge `
  --from-literal=JWT_SECRET="你的强密码" `
  --from-literal=SERVICE_API_KEY="carebridge-service-key" `
  --from-literal=OPENROUTER_API_KEY="" `
  --from-literal=DATABASE_URL="$DB_URL" `
  --dry-run=client -o yaml | kubectl apply -f -

cd k8s\overlays\aws-eks
kustomize edit set image carebridge-backend=$ECR/carebridge-backend:latest
kustomize edit set image carebridge-ai=$ECR/carebridge-web:latest
kubectl apply -k .
```

### Step 5 — 等公网 IP / 域名

```powershell
kubectl get svc -n carebridge carebridge-web carebridge-gateway -w
```

看到 `EXTERNAL-IP` 或 `hostname` 后：

```powershell
$gw = kubectl get svc carebridge-gateway -n carebridge -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
kubectl patch configmap carebridge-config -n carebridge --type merge `
  -p "{`"data`":{`"VITE_API_URL`":`"http://${gw}:3001`"}}"
kubectl rollout restart deployment/carebridge-web -n carebridge
```

浏览器打开：`http://<web-hostname>:8080`

---

## 常见问题

### EXTERNAL-IP 一直 `<pending>`

- 等 3–5 分钟  
- 确认节点 Ready：`kubectl get nodes`  
- EKS 子网需有 ELB 标签（Terraform 模块一般已配）

### 网页能开，登录失败

`VITE_API_URL` 没指到 Gateway 公网地址 → 重新执行 Step 5 的 patch。

### RDS 连接失败

确认 Secret 里 `DATABASE_URL` 是 `terraform output -raw database_url` 的值；db-init job 日志：

```powershell
kubectl logs -n carebridge job/carebridge-db-init
```

### 演示结束删资源（重要）

```powershell
cd dell\terraform\aws
terraform destroy
```

---

## 和 GitHub CD 配合

集群建好后，把 kubeconfig 存进 GitHub Secret `KUBE_CONFIG_BASE64`，以后 push 代码会自动 CD。见 `CLOUD_DEPLOY.md`。

---

## 架构图

```
Internet
   ├─► ELB :8080  → carebridge-web
   └─► ELB :3001  → carebridge-gateway → 14 microservices
                              │
                              ▼
                         RDS PostgreSQL（Terraform 托管）
```
