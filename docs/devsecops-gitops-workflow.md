# Quy Trình DevSecOps & GitOps - NT114 Project

**Version:** 1.0
**Updated:** January 4, 2026
**Status:** ✅ Production Ready

---

## 📋 Tổng Quan

Project NT114 DevSecOps sử dụng quy trình **tự động hoàn toàn** từ code → build → deploy → monitor trên **đa môi trường** (dev/prod) với các công nghệ:

- **Infrastructure as Code (IaC)**: Terraform quản lý toàn bộ AWS infrastructure
- **GitOps**: ArgoCD tự động sync và deploy applications từ Git
- **CI/CD**: GitHub Actions xây dựng và đẩy container images
- **Container Registry**: AWS ECR lưu trữ Docker images
- **Orchestration**: Amazon EKS (Kubernetes) chạy workloads
- **Monitoring**: Prometheus + Grafana + CloudWatch
- **Security**: Security scanning, RBAC, network policies

---

## 🔄 Quy Trình Hoàn Chỉnh (End-to-End Flow)

### Bước 1: Developer Push Code

```
Developer
  │
  ├─ git add .
  ├─ git commit -m "feat: add new feature"
  └─ git push origin main
      │
      └──> Trigger GitHub Actions Workflow
```

**Điều kiện trigger:**
- Push/PR đến branch `main`
- Thay đổi trong: `microservices/**`, `frontend/**`, `helm/**`
- File: `.github/workflows/deploy-dev.yml`

---

### Bước 2: GitHub Actions CI/CD Pipeline

**Workflow:** `.github/workflows/deploy-dev.yml`

#### 2.1. Detect Changes
```yaml
detect-changes:
  - Phát hiện service nào thay đổi (frontend, backend microservices)
  - Output: backend=true/false, frontend=true/false
  - Dùng git diff để so sánh với commit trước
```

#### 2.2. Build & Push Images (Song Song)

**Frontend Build:**
```yaml
build-frontend:
  if: needs.detect-changes.outputs.frontend == 'true'
  steps:
    1. Checkout code
    2. Login AWS ECR
    3. Build Docker image:
       - File: frontend/Dockerfile.prod
       - Base: nginx:alpine
       - Build React app (Vite)
       - Tag: <commit-sha>
    4. Scan image với Trivy (security scan)
    5. Push đến ECR:
       - Repository: nt114-devsecops/frontend
       - Tags: latest, <commit-sha>
```

**Backend Services Build (4 services parallel):**
```yaml
build-backend:
  matrix:
    service:
      - api-gateway
      - user-management-service
      - exercises-service
      - scores-service
  steps:
    1. Checkout code
    2. Login AWS ECR
    3. Build Docker image:
       - File: microservices/<service>/Dockerfile
       - Tag: <commit-sha>
    4. Scan image với Trivy
    5. Push đến ECR
```

**Output:** 5 Docker images đã được push vào AWS ECR

---

#### 2.3. Update Helm Values (GitOps)

```yaml
update-helm-values:
  needs: [build-frontend, build-backend]
  steps:
    1. Update helm/*/values-dev.yaml:
       - Thay đổi image tag từ old-sha → new-sha
    2. Commit changes:
       - Message: "chore(dev): update image tags to <sha> [skip ci]"
    3. Push về GitHub repo
       - Branch: main
```

**Ví dụ thay đổi:**
```yaml
# helm/frontend/values-dev.yaml
tag: "d8d567a5d9b8053586d9dd9b60287e521a41508b"  # ← Tự động update
```

**Kết quả:** Git repo có commit mới với Helm values updated

---

### Bước 3: ArgoCD GitOps Sync

ArgoCD liên tục **watch Git repository** (polling interval: 3 phút)

#### 3.1. Detect Changes
```
ArgoCD Controller
  │
  ├─ Phát hiện Helm values thay đổi
  ├─ So sánh desired state (Git) vs actual state (K8s)
  └─ Tạo diff report
```

#### 3.2. Auto-Sync
```yaml
ArgoCD Application Config:
  syncPolicy:
    automated:
      prune: true      # Xóa resources không còn trong Git
      selfHeal: true   # Tự sửa nếu ai chỉnh trực tiếp K8s
    syncOptions:
      - CreateNamespace=true
```

#### 3.3. Deployment Process
```
ArgoCD
  │
  ├─ 1. Render Helm charts với values mới
  ├─ 2. Generate Kubernetes manifests
  ├─ 3. Apply manifests đến EKS cluster
  │   ├─ Create new ReplicaSet với image mới
  │   ├─ Rolling update pods (zero-downtime)
  │   └─ Wait for health checks pass
  └─ 4. Mark sync status: Synced ✅
```

**Rolling Update Strategy:**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Tạo thêm 1 pod mới
    maxUnavailable: 0  # Không terminate pod cũ cho đến khi mới ready
```

**Health Checks:**
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 80
  initialDelaySeconds: 10
  periodSeconds: 5

livenessProbe:
  httpGet:
    path: /health
    port: 80
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

### Bước 4: Kubernetes Deployment

**EKS Cluster Architecture:**
```
┌────────────────────────────────────────────┐
│           EKS Cluster: eks-1               │
├────────────────────────────────────────────┤
│                                            │
│  Node Groups (Spot Instances):            │
│  ├─ app: t3.medium (2 nodes, 4GB RAM)     │
│  ├─ argocd: t3.medium (1 node)            │
│  └─ monitoring: t3.medium (1 node)        │
│                                            │
│  Namespaces:                               │
│  ├─ dev (applications)                     │
│  ├─ prod (applications)                    │
│  ├─ argocd (GitOps controller)            │
│  └─ monitoring (Prometheus, Grafana)      │
└────────────────────────────────────────────┘
```

**Pod Deployment:**
```
1. Pull image từ ECR:
   - ImagePullPolicy: Always
   - Credential: ecr-secret

2. Start containers:
   - Resource limits (CPU/Memory)
   - Environment variables
   - Volume mounts (nếu cần)

3. Service exposure:
   - Frontend: LoadBalancer (public)
   - Backend: ClusterIP (internal)
   - ArgoCD: NodePort (kubectl port-forward)
   - Monitoring: NodePort

4. Ingress/LoadBalancer:
   - AWS ALB tự động provision
   - SSL/TLS termination
   - Health check routes
```

---

### Bước 5: Monitoring & Observability

#### 5.1. Prometheus Metrics
```
Prometheus
  │
  ├─ Scrape metrics từ:
  │   ├─ Kubernetes API
  │   ├─ Node exporters
  │   ├─ Application /metrics endpoints
  │   └─ ArgoCD controller
  │
  └─ Store time-series data
```

**Metrics thu thập:**
- Container CPU/Memory usage
- HTTP request rate, latency, errors
- Database connections
- ArgoCD sync status
- Pod restart counts

#### 5.2. Grafana Dashboards
```
Grafana
  │
  ├─ Dashboards:
  │   ├─ Kubernetes Cluster Overview
  │   ├─ Application Performance
  │   ├─ ArgoCD Application Health
  │   └─ Cost Monitoring
  │
  └─ Alerts → Slack/Email
```

Access:
```bash
kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80
# http://localhost:3000
# Username: admin
# Password: (lấy từ GitHub Actions output)
```

#### 5.3. CloudWatch Logs
```
EKS → CloudWatch Logs
  │
  ├─ Control plane logs
  ├─ Application logs (stdout/stderr)
  ├─ Audit logs
  └─ Performance insights
```

---

## 🌍 Đa Môi Trường (Multi-Environment)

### Dev Environment

**Purpose:** Development, testing, rapid iteration

```yaml
Characteristics:
  - Branch: main
  - Namespace: dev
  - Instances: Spot (cost-optimized)
  - Replicas: 2 per service
  - Auto-scaling: Enabled (2-5 pods)
  - Database: RDS (t3.micro)
  - Domain: dev.codeland.example.com
```

**Helm Values:**
```yaml
# helm/frontend/values-dev.yaml
replicaCount: 2
image:
  repository: 039612870452.dkr.ecr.us-east-1.amazonaws.com/nt114-devsecops/frontend
  pullPolicy: Always
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

---

### Prod Environment

**Purpose:** Production workloads, high availability

```yaml
Characteristics:
  - Branch: release/prod
  - Namespace: prod
  - Instances: On-Demand (reliability)
  - Replicas: 3 per service
  - Auto-scaling: Enabled (3-10 pods)
  - Database: RDS (t3.small, Multi-AZ)
  - Domain: codeland.example.com
```

**Helm Values:**
```yaml
# helm/frontend/values-prod.yaml
replicaCount: 3
image:
  repository: 039612870452.dkr.ecr.us-east-1.amazonaws.com/nt114-devsecops/frontend
  pullPolicy: Always
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

---

### Environment Promotion

**Dev → Prod Process:**
```bash
# 1. Test in dev environment
git push origin main
# → Deploy to dev via ArgoCD

# 2. Verify in dev
kubectl get pods -n dev
curl https://dev.codeland.example.com/health

# 3. Tag release
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 4. Merge to prod branch
git checkout release/prod
git merge main
git push origin release/prod
# → Deploy to prod via ArgoCD

# 5. Monitor rollout
kubectl rollout status deployment/frontend-prod -n prod
```

**Rollback nếu có lỗi:**
```bash
# ArgoCD tự động rollback nếu health check fail
# Hoặc manual rollback:
argocd app rollback frontend-prod
```

---

## 🔐 Security Implementation

### 1. Container Security

**Image Scanning (Trivy):**
```yaml
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.ECR_REGISTRY }}/${{ matrix.service }}:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1  # Fail build nếu có critical vulnerabilities
```

**Non-root Containers:**
```dockerfile
# Dockerfile.prod
FROM nginx:alpine
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser
USER appuser
```

---

### 2. Kubernetes RBAC

**Service Accounts:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend-sa
  namespace: dev
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: frontend-role
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
```

---

### 3. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
      - podSelector:
          matchLabels:
            tier: frontend
      ports:
        - protocol: TCP
          port: 8080
```

---

### 4. Secrets Management

**AWS Secrets Manager + External Secrets:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: postgres-secret
  data:
    - secretKey: password
      remoteRef:
        key: prod/postgres/password
```

---

## 📊 Infrastructure as Code (Terraform)

### Terraform Modules Structure

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf           # Root module
│   │   ├── variables.tf      # Input variables
│   │   ├── outputs.tf        # Outputs
│   │   ├── terraform.tfvars  # Environment-specific values
│   │   └── providers.tf      # AWS, K8s, Helm providers
│   └── prod/
│       └── (same structure)
│
└── modules/
    ├── vpc/                  # VPC, Subnets, NAT Gateway
    ├── eks-cluster/          # EKS control plane
    ├── eks-nodegroup/        # Worker nodes
    ├── rds/                  # PostgreSQL database
    ├── ebs-csi-driver/       # EBS CSI for persistent volumes
    └── storage-classes/      # K8s storage classes (gp3)
```

---

### Terraform Deployment Flow

**1. Infrastructure Provisioning:**
```bash
cd terraform/environments/dev

# Initialize
terraform init

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

**2. Resources Created:**
```
AWS Resources:
├─ VPC (10.0.0.0/16)
│  ├─ Public Subnets (2 AZs)
│  ├─ Private Subnets (2 AZs)
│  ├─ NAT Gateways (2)
│  └─ Internet Gateway
│
├─ EKS Cluster
│  ├─ Control Plane (Managed)
│  ├─ Node Groups (App, ArgoCD, Monitoring)
│  └─ OIDC Provider (for IAM roles)
│
├─ RDS PostgreSQL
│  ├─ Instance (t3.micro)
│  ├─ Subnet Group
│  └─ Security Group
│
├─ ECR Repositories
│  ├─ frontend
│  ├─ api-gateway
│  ├─ user-management-service
│  ├─ exercises-service
│  └─ scores-service
│
└─ IAM Roles & Policies
   ├─ EKS Cluster Role
   ├─ Node Group Role
   ├─ EBS CSI Driver Role
   └─ ArgoCD Role
```

**3. Kubernetes Resources (via Terraform):**
```hcl
# EBS CSI Driver
module "ebs_csi_driver" {
  source            = "../../modules/ebs-csi-driver"
  cluster_name      = module.eks_cluster.cluster_name
  oidc_provider     = module.eks_cluster.oidc_provider
  oidc_provider_arn = module.eks_cluster.oidc_provider_arn
}

# Storage Classes
module "storage_classes" {
  source               = "../../modules/storage-classes"
  ebs_csi_driver_ready = module.ebs_csi_driver.addon_arn
}
```

**4. State Management:**
```hcl
# Local state (dev environment)
# Production should use S3 backend:
terraform {
  backend "s3" {
    bucket = "nt114-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-locks"
  }
}
```

---

## 🚀 Complete Deployment Example

### Scenario: Thêm Feature Mới

**1. Developer Code:**
```bash
# Tạo branch mới
git checkout -b feature/add-leaderboard

# Code feature
vim frontend/src/pages/Leaderboard.tsx

# Commit
git add .
git commit -m "feat(frontend): add leaderboard page"
git push origin feature/add-leaderboard

# Tạo PR
gh pr create --title "Add Leaderboard" --body "New leaderboard feature"
```

**2. Code Review & Merge:**
```bash
# Review qua GitHub UI
# Approve & Merge to main
```

**3. Automatic CI/CD:**
```
GitHub Actions (3-5 phút):
  ├─ 1. Detect changes: frontend=true
  ├─ 2. Build Docker image:
  │     - Tag: abc123 (commit SHA)
  │     - Size: ~50MB (nginx + static files)
  ├─ 3. Security scan: ✅ Pass
  ├─ 4. Push to ECR: ✅ Done
  └─ 5. Update Helm values:
        - helm/frontend/values-dev.yaml
        - tag: "abc123"
        - Commit & push
```

**4. ArgoCD Sync (1-3 phút):**
```
ArgoCD:
  ├─ 1. Detect Git change
  ├─ 2. Render Helm chart
  ├─ 3. Deploy to K8s:
  │     - Create new pods với image abc123
  │     - Rolling update (0 downtime)
  │     - Health check pass
  └─ 4. Status: Synced ✅ Healthy ✅
```

**5. Verification:**
```bash
# Check pods
kubectl get pods -n dev | grep frontend
# frontend-dev-6447f96fb9-xxxxx   1/1   Running   0   30s
# frontend-dev-6447f96fb9-yyyyy   1/1   Running   0   15s

# Check ArgoCD
kubectl get application frontend-dev -n argocd
# NAME           SYNC STATUS   HEALTH STATUS
# frontend-dev   Synced        Healthy

# Test endpoint
curl https://dev.codeland.example.com/leaderboard
# { "data": [...] }
```

**Total Time:** 5-8 phút từ push code → deploy production ✅

---

## 🎯 Key Benefits

### 1. Tự Động Hoàn Toàn
- ✅ Không cần chạy kubectl/helm thủ công
- ✅ Không cần login vào servers
- ✅ Git là single source of truth

### 2. Reliability
- ✅ Rolling updates (zero downtime)
- ✅ Auto-rollback nếu health check fail
- ✅ Immutable infrastructure

### 3. Security
- ✅ Image scanning trước khi deploy
- ✅ RBAC enforcement
- ✅ Network policies
- ✅ Secrets không commit vào Git

### 4. Observability
- ✅ Centralized logging (CloudWatch)
- ✅ Metrics & alerting (Prometheus/Grafana)
- ✅ Distributed tracing
- ✅ Audit logs

### 5. Cost Optimization
- ✅ Spot instances (dev: tiết kiệm 70%)
- ✅ Auto-scaling (scale to zero khi không dùng)
- ✅ Resource limits enforcement
- ✅ Cost monitoring dashboards

---

## 📚 Tài Liệu Liên Quan

- **System Architecture:** `docs/system-architecture.md`
- **Deployment Guide:** `docs/deployment-guide.md`
- **Terraform Manual Fixes:** `docs/terraform-manual-fixes.md`
- **Accessing Services:** `docs/accessing-nodeport-services.md`
- **Monitoring Setup:** `docs/monitoring-gitops-architecture.md`

---

## 🔧 Troubleshooting

### Image Pull Errors
```bash
# Check ECR permissions
kubectl get secrets ecr-secret -n dev -o yaml

# Recreate ECR secret
aws ecr get-login-password --region us-east-1 | \
  kubectl create secret docker-registry ecr-secret \
  --docker-server=039612870452.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password-file=/dev/stdin \
  -n dev --dry-run=client -o yaml | kubectl apply -f -
```

### ArgoCD Sync Stuck
```bash
# Force refresh
argocd app get frontend-dev --refresh

# Manual sync
argocd app sync frontend-dev

# Check logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

### Pod Crashes
```bash
# Check logs
kubectl logs -n dev <pod-name> --previous

# Check events
kubectl describe pod -n dev <pod-name>

# Check resource constraints
kubectl top pod -n dev <pod-name>
```

---

**Kết luận:** Toàn bộ quy trình từ code → production hoàn toàn tự động, an toàn, và có thể quan sát được. Developer chỉ cần `git push`, còn lại hệ thống tự động xử lý! 🚀
