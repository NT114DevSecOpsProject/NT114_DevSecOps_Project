# Quick Start Guide - NT114 DevSecOps Project

Hướng dẫn đầy đủ từ đầu đến cuối để deploy application lên AWS EKS.

---

## 📋 Prerequisites

Đảm bảo đã cài đặt:

- ✅ **AWS Account** với admin access
- ✅ **AWS CLI** configured (`aws configure`)
- ✅ **Terraform** >= 1.5.0
- ✅ **kubectl**
- ✅ **Helm** >= 3.x
- ✅ **Git**
- ✅ **GitHub Account** (đã fork repo này)

**Kiểm tra:**
```bash
aws --version
terraform --version
kubectl version --client
helm version
git --version
```

---

## 🚀 Bước 1: Tạo Infrastructure với Terraform

### 1.1 - Navigate to Terraform directory

```bash
cd terraform/environments/dev
```

### 1.2 - Initialize Terraform

```bash
terraform init
```

**Output mong đợi:**
```
Initializing modules...
Initializing the backend...
Terraform has been successfully initialized!
```

### 1.3 - Review Plan

```bash
terraform plan
```

**Output:** Sẽ tạo ~50-60 resources bao gồm:
- VPC với public/private subnets
- NAT Gateway, Internet Gateway
- EKS Cluster (eks-1)
- EKS Node Group (2 nodes t3.large)
- RDS PostgreSQL instance
- Security Groups
- IAM Roles

### 1.4 - Apply Infrastructure

```bash
terraform apply
```

**Nhập:** `yes` khi được hỏi

⏱️ **Thời gian:** ~15-20 phút

**Output cuối cùng:**
```
Apply complete! Resources: 56 added, 0 changed, 0 destroyed.

Outputs:
cluster_name = "eks-1"
cluster_endpoint = "https://xxxxx.eks.us-east-1.amazonaws.com"
vpc_id = "vpc-xxxxx"
database_endpoint = "nt114-auth-db.xxxxx.us-east-1.rds.amazonaws.com"
```

✅ **Checkpoint:** Infrastructure đã được tạo

---

## 🔧 Bước 2: Configure kubectl

### 2.1 - Update kubeconfig

```bash
aws eks update-kubeconfig --region us-east-1 --name eks-1
```

### 2.2 - Verify cluster access

```bash
kubectl get nodes
```

**Output mong đợi:**
```
NAME                           STATUS   ROLES    AGE   VERSION
ip-11-0-1-xxx.ec2.internal     Ready    <none>   5m    v1.31.x
ip-11-0-2-xxx.ec2.internal     Ready    <none>   5m    v1.31.x
```

### 2.3 - Check namespaces

```bash
kubectl get namespaces
```

**Output:** Sẽ thấy `dev` namespace đã được tạo bởi Terraform

✅ **Checkpoint:** kubectl đã connect đến EKS cluster

---

## 📦 Bước 3: Setup GitHub Secrets

### 3.1 - Get AWS credentials

Lấy AWS Access Key và Secret Key từ AWS Console hoặc:

```bash
aws configure list
```

### 3.2 - Add GitHub Secrets

Vào GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Thêm 2 secrets:
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

✅ **Checkpoint:** GitHub secrets đã được thêm

---

## 🏗️ Bước 4: Build và Push Docker Images

### 4.1 - Trigger Frontend Build

**Cách 1:** Push code changes trong folder `frontend/`

**Cách 2:** Manual trigger qua GitHub Actions
- Vào tab **Actions** → **Frontend Build** → **Run workflow**

⏱️ **Thời gian:** ~3-5 phút

**Kết quả:** Image được push lên ECR:
```
039612870452.dkr.ecr.us-east-1.amazonaws.com/nt114-devsecops/frontend:latest
```

### 4.2 - Trigger Backend Build

**Cách 1:** Push code changes trong folder `microservices/`

**Cách 2:** Manual trigger qua GitHub Actions
- Vào tab **Actions** → **Backend Microservices Build** → **Run workflow**

⏱️ **Thời gian:** ~5-8 phút (build 4 services song song)

**Kết quả:** 4 images được push lên ECR:
- `api-gateway:latest`
- `user-management-service:latest`
- `exercises-service:latest`
- `scores-service:latest`

### 4.3 - Verify images in ECR

```bash
aws ecr list-images --repository-name nt114-devsecops/frontend --region us-east-1
aws ecr list-images --repository-name nt114-devsecops/api-gateway --region us-east-1
```

✅ **Checkpoint:** Tất cả images đã có trên ECR

---

## 🗄️ Bước 5: Setup Database

### 5.1 - Get RDS endpoint

```bash
cd terraform/environments/dev
terraform output database_endpoint
```

**Output:** `nt114-auth-db.xxxxxx.us-east-1.rds.amazonaws.com`

### 5.2 - Create database schema

Từ root folder của project:

```bash
# Set environment variables
export DB_HOST="<RDS_ENDPOINT_FROM_ABOVE>"
export DB_PORT="5432"
export DB_NAME="auth_db"
export DB_USER="postgres"
export DB_PASSWORD="postgres123"  # Hoặc password bạn đã set trong Terraform

# Run schema creation script
python3 create_db_schema.py
```

**Output mong đợi:**
```
Connecting to database...
Creating users table...
Creating exercises table...
Creating scores table...
✓ Database schema created successfully!
```

### 5.3 - Verify tables created

```bash
# Connect to RDS
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# List tables
\dt

# Exit
\q
```

**Hoặc dùng kubectl exec vào một pod và connect:**

```bash
kubectl exec -it -n dev deployment/user-management-service -- bash
psql -h nt114-auth-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d auth_db
```

✅ **Checkpoint:** Database đã sẵn sàng

---

## 🔐 Bước 6: Create Kubernetes Secrets

### 6.1 - Create database secret

```bash
kubectl create secret generic user-management-db-secret \
  --from-literal=DB_HOST='<RDS_ENDPOINT>' \
  --from-literal=DB_PORT='5432' \
  --from-literal=DB_NAME='auth_db' \
  --from-literal=DB_USER='postgres' \
  --from-literal=DB_PASSWORD='postgres123' \
  -n dev
```

### 6.2 - Create ECR pull secret

```bash
# Get ECR login password
ECR_PASSWORD=$(aws ecr get-login-password --region us-east-1)

# Create secret
kubectl create secret docker-registry ecr-secret \
  --docker-server=039612870452.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$ECR_PASSWORD \
  -n dev
```

### 6.3 - Verify secrets

```bash
kubectl get secrets -n dev
```

**Output:**
```
NAME                           TYPE                             DATA   AGE
user-management-db-secret      Opaque                           5      10s
ecr-secret                     kubernetes.io/dockerconfigjson   1      5s
```

✅ **Checkpoint:** Secrets đã được tạo

---

## 📱 Bước 7: Deploy Services với Helm

### 7.1 - Deploy API Gateway

```bash
cd helm
helm install api-gateway ./api-gateway -f ./api-gateway/values-eks.yaml -n dev
```

### 7.2 - Deploy User Management Service

```bash
helm install user-management-service ./user-management-service -f ./user-management-service/values-eks.yaml -n dev
```

### 7.3 - Deploy Exercises Service

```bash
helm install exercises-service ./exercises-service -f ./exercises-service/values-eks.yaml -n dev
```

### 7.4 - Deploy Scores Service

```bash
helm install scores-service ./scores-service -f ./scores-service/values-eks.yaml -n dev
```

### 7.5 - Deploy Frontend

```bash
helm install frontend ./frontend -f ./frontend/values-eks.yaml -n dev
```

### 7.6 - Verify deployments

```bash
kubectl get pods -n dev
```

**Output mong đợi (sau 2-3 phút):**
```
NAME                                      READY   STATUS    RESTARTS   AGE
api-gateway-xxxxx-xxxxx                   1/1     Running   0          2m
api-gateway-xxxxx-xxxxx                   1/1     Running   0          2m
user-management-service-xxxxx-xxxxx       1/1     Running   0          2m
user-management-service-xxxxx-xxxxx       1/1     Running   0          2m
exercises-service-xxxxx-xxxxx             1/1     Running   0          2m
exercises-service-xxxxx-xxxxx             1/1     Running   0          2m
scores-service-xxxxx-xxxxx                1/1     Running   0          2m
scores-service-xxxxx-xxxxx                1/1     Running   0          2m
frontend-xxxxx-xxxxx                      1/1     Running   0          2m
frontend-xxxxx-xxxxx                      1/1     Running   0          2m
```

✅ **Checkpoint:** Tất cả services đang chạy

---

## 🌐 Bước 8: Expose Services

### 8.1 - Check services

```bash
kubectl get svc -n dev
```

**Output:**
```
NAME                        TYPE           CLUSTER-IP      EXTERNAL-IP                          PORT(S)
api-gateway                 LoadBalancer   10.100.x.x      axxxxx.us-east-1.elb.amazonaws.com   8080:30336/TCP
frontend                    LoadBalancer   10.100.x.x      axxxxx.us-east-1.elb.amazonaws.com   80:31184/TCP
user-management-service     ClusterIP      10.100.x.x      <none>                               8081/TCP
exercises-service           ClusterIP      10.100.x.x      <none>                               8082/TCP
scores-service              ClusterIP      10.100.x.x      <none>                               8083/TCP
```

### 8.2 - Get application URLs

```bash
# Frontend URL
FRONTEND_URL=$(kubectl get svc frontend -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Frontend: http://$FRONTEND_URL"

# API Gateway URL
API_URL=$(kubectl get svc api-gateway -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "API Gateway: http://$API_URL:8080"
```

**Lưu lại 2 URLs này!**

✅ **Checkpoint:** Services đã được expose qua LoadBalancer

---

## ✅ Bước 9: Verify Application

### 9.1 - Test API Gateway

```bash
# Health check
curl http://$API_URL:8080/health

# Test registration
curl -X POST http://$API_URL:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

**Output mong đợi:**
```json
{
  "message": "User registered successfully.",
  "status": "success"
}
```

### 9.2 - Test Login

```bash
curl -X POST http://$API_URL:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Output:**
```json
{
  "auth_token": "eyJhbGci...",
  "data": {
    "email": "test@example.com",
    "username": "testuser"
  },
  "status": "success"
}
```

### 9.3 - Test Frontend

Mở browser và truy cập: `http://<FRONTEND_URL>`

**Bạn sẽ thấy:**
- ✅ Trang web hiển thị
- ✅ Có thể đăng ký tài khoản
- ✅ Có thể đăng nhập
- ✅ Có thể vào Dashboard sau khi login
- ✅ Có thể xem Scores và Exercises

✅ **Checkpoint:** Application hoạt động hoàn toàn!

---

## 🎉 Hoàn Thành!

Bạn đã deploy thành công ứng dụng với:

- ✅ **EKS Cluster** với 2 worker nodes
- ✅ **RDS PostgreSQL** database
- ✅ **5 services** running (1 frontend + 4 backend microservices)
- ✅ **Load Balancers** cho external access
- ✅ **Auto-scaling** enabled (HPA)
- ✅ **Monitoring** với health checks

---

## 🔧 Useful Commands

### Check Pods
```bash
kubectl get pods -n dev
kubectl logs -f <pod-name> -n dev
kubectl describe pod <pod-name> -n dev
```

### Check Services
```bash
kubectl get svc -n dev
kubectl describe svc <service-name> -n dev
```

### Check HPA (Auto-scaling)
```bash
kubectl get hpa -n dev
```

### Restart a service
```bash
kubectl rollout restart deployment/<service-name> -n dev
```

### Update a service
```bash
# After changing Helm values
helm upgrade <service-name> ./helm/<service-name> -f ./helm/<service-name>/values-eks.yaml -n dev
```

### Delete all services
```bash
helm uninstall api-gateway -n dev
helm uninstall user-management-service -n dev
helm uninstall exercises-service -n dev
helm uninstall scores-service -n dev
helm uninstall frontend -n dev
```

### Destroy infrastructure
```bash
cd terraform/environments/dev
terraform destroy
```

---

## 🐛 Troubleshooting

### Pod không start

```bash
# Check pod status
kubectl get pods -n dev

# Check events
kubectl describe pod <pod-name> -n dev

# Check logs
kubectl logs <pod-name> -n dev
```

**Common issues:**
- **ImagePullBackOff**: ECR secret chưa đúng hoặc image không tồn tại
  - Fix: Recreate ECR secret với credentials mới
- **CrashLoopBackOff**: Container bị crash
  - Fix: Check logs để xem lỗi gì
- **Pending**: Node không đủ resources
  - Fix: Scale up node group hoặc giảm resource requests

### Service không accessible

```bash
# Check service
kubectl get svc <service-name> -n dev

# Check endpoints
kubectl get endpoints <service-name> -n dev
```

### Database connection issues

```bash
# Verify secret exists
kubectl get secret user-management-db-secret -n dev

# Check pod can connect to RDS
kubectl exec -it <pod-name> -n dev -- bash
nc -zv <RDS_ENDPOINT> 5432
```

**Common fix:** Check Security Groups - RDS phải allow inbound từ EKS nodes

### Frontend can't connect to API

1. Check API Gateway LoadBalancer URL
2. Verify nginx config forwards requests correctly
3. Check CORS settings
4. Verify frontend env var `VITE_API_URL` is empty (uses nginx proxy)

---

## 🔄 Bước 10: Setup GitOps với ArgoCD (Recommended)

ArgoCD giúp tự động deploy applications từ Git repository, giúp quản lý deployments dễ dàng hơn và đảm bảo Git là single source of truth.

### 10.1 - Install ArgoCD

```bash
# Create argocd namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

⏱️ **Thời gian:** ~2-3 phút

### 10.2 - Expose ArgoCD Server

```bash
# Patch argocd-server service to LoadBalancer
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Wait for LoadBalancer to be ready
kubectl get svc argocd-server -n argocd -w
```

Đợi cho đến khi thấy EXTERNAL-IP (Ctrl+C để thoát watch):

```
NAME            TYPE           CLUSTER-IP      EXTERNAL-IP                                            PORT(S)
argocd-server   LoadBalancer   10.100.x.x      axxxxx.us-east-1.elb.amazonaws.com                    80:xxxxx/TCP,443:xxxxx/TCP
```

### 10.3 - Get ArgoCD Admin Password

```bash
# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
```

**Lưu lại password này!**

### 10.4 - Access ArgoCD UI

```bash
# Get ArgoCD URL
ARGOCD_URL=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "ArgoCD URL: http://$ARGOCD_URL"
```

Mở browser và đăng nhập:
- **URL**: `http://<ARGOCD_URL>`
- **Username**: `admin`
- **Password**: `<password từ bước 10.3>`

### 10.5 - Deploy Applications với ArgoCD

#### Option A: Deploy tất cả applications cùng lúc

```bash
# Apply all ArgoCD application manifests
kubectl apply -f argocd/applications/
```

#### Option B: Deploy từng application riêng

```bash
# Deploy API Gateway
kubectl apply -f argocd/applications/api-gateway.yaml

# Deploy User Management Service
kubectl apply -f argocd/applications/user-management-service.yaml

# Deploy Exercises Service
kubectl apply -f argocd/applications/exercises-service.yaml

# Deploy Scores Service
kubectl apply -f argocd/applications/scores-service.yaml

# Deploy Frontend
kubectl apply -f argocd/applications/frontend.yaml
```

### 10.6 - Verify ArgoCD Applications

```bash
# Check applications status
kubectl get applications -n argocd
```

**Output mong đợi:**
```
NAME                      SYNC STATUS   HEALTH STATUS
api-gateway               Synced        Healthy
exercises-service         Synced        Healthy
frontend                  Synced        Healthy
scores-service            Synced        Healthy
user-management-service   Synced        Healthy
```

### 10.7 - Monitor Sync Progress

**Via CLI:**
```bash
# Watch all applications
kubectl get applications -n argocd -w

# Get detailed status of specific app
kubectl describe application api-gateway -n argocd
```

**Via ArgoCD UI:**
1. Mở ArgoCD UI trong browser
2. Bạn sẽ thấy tất cả 5 applications
3. Click vào bất kỳ application để xem resource tree
4. Màu xanh = Healthy & Synced

### 10.8 - Verify Auto-Sync

ArgoCD đã được configure với auto-sync enabled. Test bằng cách:

```bash
# Edit một Helm value (ví dụ: change replica count)
cd helm/api-gateway
# Edit values-eks.yaml, change replicaCount từ 2 thành 3

# Commit và push
git add values-eks.yaml
git commit -m "test: increase api-gateway replicas to 3"
git push origin main

# ArgoCD sẽ tự động detect và sync trong vòng ~3 phút
# Watch trong ArgoCD UI hoặc CLI
kubectl get applications -n argocd -w
```

✅ **Checkpoint:** ArgoCD đang quản lý tất cả applications

---

## 🎯 GitOps Workflow với ArgoCD

Sau khi setup ArgoCD, workflow của bạn sẽ đơn giản hơn:

### Update Application

**Before (Manual Helm):**
```bash
# Edit Helm values
vim helm/api-gateway/values-eks.yaml

# Apply manually
helm upgrade api-gateway ./helm/api-gateway -f ./helm/api-gateway/values-eks.yaml -n dev
```

**After (GitOps with ArgoCD):**
```bash
# Edit Helm values
vim helm/api-gateway/values-eks.yaml

# Commit and push
git add helm/api-gateway/values-eks.yaml
git commit -m "feat: update api-gateway configuration"
git push origin main

# ArgoCD tự động deploy! Không cần chạy helm upgrade
```

### Rollback Application

**Via ArgoCD UI:**
1. Vào application page
2. Click **History and Rollback**
3. Chọn revision cũ hơn
4. Click **Rollback**

**Via CLI:**
```bash
# View history
kubectl get applications api-gateway -n argocd -o yaml | grep -A 10 status:

# ArgoCD tự động rollback nếu Git được revert
git revert <commit-hash>
git push origin main
```

### Add New Service

1. Tạo Helm chart mới trong `helm/<new-service>/`
2. Tạo ArgoCD Application manifest:

```yaml
# argocd/applications/new-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: new-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/NT114DevSecOpsProject/NT114_DevSecOps_Project.git
    targetRevision: main
    path: helm/new-service
    helm:
      valueFiles:
        - values-eks.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

3. Apply manifest:
```bash
kubectl apply -f argocd/applications/new-service.yaml
```

✅ ArgoCD sẽ tự động deploy service mới!

---

## 📊 ArgoCD Best Practices

### 1. Git là Source of Truth
- ❌ KHÔNG bao giờ edit resources trực tiếp trên cluster (`kubectl edit`)
- ✅ LUÔN edit trong Git repository và push

### 2. Use Separate Branches
```bash
# Create feature branch
git checkout -b feature/update-api

# Make changes
vim helm/api-gateway/values-eks.yaml

# Test on feature branch first
# Update ArgoCD app to point to feature branch temporarily
kubectl patch app api-gateway -n argocd --type merge -p '{"spec":{"source":{"targetRevision":"feature/update-api"}}}'

# If OK, merge to main
git checkout main
git merge feature/update-api
git push origin main

# ArgoCD auto-syncs from main branch
```

### 3. Monitor Sync Status
```bash
# Setup alerts for sync failures (example)
kubectl get applications -n argocd -o json | jq '.items[] | select(.status.health.status != "Healthy")'
```

### 4. Documentation
Đọc thêm ArgoCD documentation tại: `argocd/README.md`

---

## 📚 Next Steps

1. **Custom Domain**: Setup Route53 for custom domain
2. **HTTPS**: Add SSL certificate via ACM
3. **Monitoring**: Install Prometheus & Grafana
4. **Logging**: Setup CloudWatch Logs or ELK stack
5. **CI/CD**: Fully automate with GitHub Actions + ArgoCD
6. **Backup**: Setup database backups
7. **Security**: Implement WAF, security groups hardening
8. **Multi-Environment**: Create staging/production with ArgoCD ApplicationSets

---

## 📞 Support

Nếu gặp vấn đề:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) cho chi tiết hơn
2. Check [argocd/README.md](argocd/README.md) cho ArgoCD troubleshooting
3. Check logs: `kubectl logs <pod-name> -n dev`
4. Check events: `kubectl get events -n dev --sort-by='.lastTimestamp'`
5. Check ArgoCD app status: `kubectl get applications -n argocd`
6. Verify all prerequisites được cài đúng version
