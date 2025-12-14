# Quick Start Guide - NT114 DevSecOps Project

Hướng dẫn đầy đủ từ đầu đến cuối để deploy application lên AWS EKS với ArgoCD.

---

## 📋 Prerequisites

Đảm bảo đã cài đặt:

- ✅ **AWS Account** với admin access
- ✅ **AWS CLI** configured (`aws configure`)
- ✅ **Terraform** >= 1.5.0
- ✅ **kubectl**
- ✅ **Git**

**Kiểm tra:**
```bash
aws --version
terraform --version
kubectl version --client
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
- ECR Repositories (5 repos)

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
rds_instance_endpoint = "nt114-postgres-dev.cy7o684ygirj.us-east-1.rds.amazonaws.com:5432"
```

### 1.5 - Lưu lại thông tin quan trọng

```bash
# Lấy RDS credentials
terraform output -raw rds_instance_username  # Output: postgres
terraform output -raw rds_instance_password  # Lưu password này!
terraform output -raw rds_instance_endpoint  # Lưu endpoint này!

# Lấy AWS Account ID
aws sts get-caller-identity --query Account --output text
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

✅ **Checkpoint:** kubectl đã connect đến EKS cluster

---

## 📦 Bước 3: Build và Push Docker Images

**Nếu đã có images trong ECR, bỏ qua bước này**

### 3.1 - Login to ECR

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

### 3.2 - Build và Push Images

**Option 1: Sử dụng GitHub Actions (Recommended)**

Trigger workflows trong GitHub:
- **Frontend Build** workflow
- **Backend Microservices Build** workflow

**Option 2: Build locally**

```bash
# Build từng service
cd microservices/api-gateway
docker build -t <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/nt114-devsecops/api-gateway:latest .
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/nt114-devsecops/api-gateway:latest

# Lặp lại cho user-management-service, exercises-service, scores-service, frontend
```

### 3.3 - Verify images

```bash
aws ecr list-images --repository-name nt114-devsecops/frontend --region us-east-1
aws ecr list-images --repository-name nt114-devsecops/api-gateway --region us-east-1
aws ecr list-images --repository-name nt114-devsecops/user-management-service --region us-east-1
aws ecr list-images --repository-name nt114-devsecops/exercises-service --region us-east-1
aws ecr list-images --repository-name nt114-devsecops/scores-service --region us-east-1
```

✅ **Checkpoint:** Tất cả 5 images đã có trong ECR

---

## 🎯 Bước 4: Deploy với ArgoCD (GitOps Approach)

Từ bước này, giả sử **đã có images trong ECR**.

### 4.1 - Create dev namespace

```bash
kubectl create namespace dev
```

### 4.2 - Install ArgoCD

```bash
# Create ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

⏱️ **Thời gian:** ~2-3 phút

**Verify:**
```bash
kubectl get pods -n argocd
```

Đợi cho đến khi tất cả pods đều **Running**

### 4.3 - Expose ArgoCD Server

```bash
# Patch service to LoadBalancer
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Wait for LoadBalancer (khoảng 2-3 phút)
kubectl get svc argocd-server -n argocd -w
```

Đợi cho đến khi thấy **EXTERNAL-IP** (Ctrl+C để thoát)

### 4.4 - Get ArgoCD Credentials

```bash
# Get ArgoCD password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD Password: $ARGOCD_PASSWORD"

# Get ArgoCD URL
ARGOCD_URL=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "ArgoCD URL: http://$ARGOCD_URL"
echo "Username: admin"
```

**Lưu lại:**
- ArgoCD URL: `http://<EXTERNAL-IP>`
- Username: `admin`
- Password: `<ARGOCD_PASSWORD>`

✅ **Checkpoint:** ArgoCD đã được cài đặt và accessible

---

## 🔐 Bước 5: Create Kubernetes Secrets

### 5.1 - Get thông tin từ Terraform

```bash
cd terraform/environments/dev

# Get RDS credentials
RDS_ENDPOINT=$(terraform output -raw rds_instance_endpoint | cut -d':' -f1)
RDS_PASSWORD=$(terraform output -raw rds_instance_password)
RDS_USERNAME=$(terraform output -raw rds_instance_username)

echo "RDS Endpoint: $RDS_ENDPOINT"
echo "RDS Username: $RDS_USERNAME"
echo "RDS Password: $RDS_PASSWORD"
```

### 5.2 - Create Database Secret

```bash
kubectl create secret generic user-management-db-secret \
  --from-literal=DB_HOST="$RDS_ENDPOINT" \
  --from-literal=DB_PORT='5432' \
  --from-literal=DB_NAME='auth_db' \
  --from-literal=DB_USER="$RDS_USERNAME" \
  --from-literal=DB_PASSWORD="$RDS_PASSWORD" \
  -n dev
```

### 5.3 - Create ECR Pull Secret

```bash
# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR secret
ECR_PASSWORD=$(aws ecr get-login-password --region us-east-1)
kubectl create secret docker-registry ecr-secret -n dev \
  --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password="$ECR_PASSWORD"
```

### 5.4 - Verify Secrets

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

## 🗄️ Bước 6: Fix RDS Security Group

**QUAN TRỌNG:** RDS cần allow traffic từ EKS nodes

### 6.1 - Get Security Group IDs

```bash
# Get RDS security group
RDS_SG=$(aws rds describe-db-instances --db-instance-identifier nt114-postgres-dev --region us-east-1 --query 'DBInstances[0].VpcSecurityGroups[*].VpcSecurityGroupId' --output text)

# Get EKS node security group
NODE_SG=$(kubectl get nodes -o jsonpath='{.items[0].spec.providerID}' | cut -d'/' -f5 | xargs -I {} aws ec2 describe-instances --instance-ids {} --region us-east-1 --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' --output text)

echo "RDS Security Group: $RDS_SG"
echo "EKS Node Security Group: $NODE_SG"
```

### 6.2 - Add Inbound Rule

```bash
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $NODE_SG \
  --region us-east-1
```

**Output:**
```json
{
    "Return": true,
    "SecurityGroupRules": [...]
}
```

✅ **Checkpoint:** EKS pods có thể connect đến RDS

---

## 💾 Bước 7: Initialize Database

### 7.1 - Apply Database Initialization Job

```bash
# From project root
kubectl apply -f init-db-job.yaml
```

### 7.2 - Wait for Job Completion

```bash
kubectl get jobs -n dev -w
```

Đợi cho đến khi **COMPLETIONS** là `1/1` (Ctrl+C để thoát)

### 7.3 - Verify Database

```bash
# Check job logs
POD=$(kubectl get pods -n dev -l job-name=init-database -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n dev $POD
```

**Output mong đợi:**
```
DROP DATABASE
CREATE DATABASE
CREATE TABLE
CREATE TABLE
CREATE TABLE
INSERT 0 1
INSERT 0 1
```

**Database đã tạo:**
- ✅ Database `auth_db`
- ✅ Tables: `users`, `exercises`, `scores`
- ✅ Default users: `admin` (admin@example.com) và `phuochv` (phuochv@example.com)
- ✅ Password cho cả 2: `123456`

✅ **Checkpoint:** Database đã sẵn sàng với schema và default users

---

## 🚢 Bước 8: Deploy Applications với ArgoCD

### 8.1 - Apply ArgoCD Applications

```bash
# Deploy all applications
kubectl apply -f argocd/applications/ --validate=false
```

**Output:**
```
application.argoproj.io/api-gateway created
application.argoproj.io/exercises-service created
application.argoproj.io/frontend created
application.argoproj.io/scores-service created
application.argoproj.io/user-management-service created
```

### 8.2 - Monitor Deployment

```bash
# Watch applications status
kubectl get applications -n argocd -w
```

Đợi cho đến khi tất cả applications có:
- **SYNC STATUS:** Synced
- **HEALTH STATUS:** Healthy

**Output mong đợi:**
```
NAME                      SYNC STATUS   HEALTH STATUS
api-gateway               Synced        Healthy
exercises-service         Synced        Healthy
frontend                  Synced        Healthy
scores-service            Synced        Healthy
user-management-service   Synced        Healthy
```

⏱️ **Thời gian:** ~3-5 phút

### 8.3 - Check Pods

```bash
kubectl get pods -n dev
```

**Output mong đợi:**
```
NAME                                       READY   STATUS    RESTARTS   AGE
api-gateway-xxxxx-xxxxx                    1/1     Running   0          2m
api-gateway-xxxxx-xxxxx                    1/1     Running   0          2m
exercises-service-xxxxx-xxxxx              1/1     Running   0          2m
exercises-service-xxxxx-xxxxx              1/1     Running   0          2m
frontend-xxxxx-xxxxx                       1/1     Running   0          2m
frontend-xxxxx-xxxxx                       1/1     Running   0          2m
scores-service-xxxxx-xxxxx                 1/1     Running   0          2m
scores-service-xxxxx-xxxxx                 1/1     Running   0          2m
user-management-service-xxxxx-xxxxx        1/1     Running   0          2m
user-management-service-xxxxx-xxxxx        1/1     Running   0          2m
```

✅ **Checkpoint:** Tất cả applications đang chạy healthy

---

## 🌐 Bước 9: Get Access URLs

### 9.1 - Get Frontend URL

```bash
FRONTEND_URL=$(kubectl get svc frontend -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Frontend: http://$FRONTEND_URL"
```

### 9.2 - Get API Gateway URL

```bash
API_URL=$(kubectl get svc api-gateway -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "API Gateway: http://$API_URL:8080"
```

### 9.3 - Get ArgoCD URL

```bash
echo "ArgoCD: http://$ARGOCD_URL"
echo "Username: admin"
echo "Password: $ARGOCD_PASSWORD"
```

**Lưu lại 3 URLs này!**

✅ **Checkpoint:** Có được tất cả access URLs

---

## ✅ Bước 10: Verify Application

### 10.1 - Test Login với Default Users

```bash
# Test login với admin account
curl -X POST http://$API_URL:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"123456"}'
```

**Output mong đợi:**
```json
{
  "auth_token": "eyJhbGci...",
  "data": {
    "active": true,
    "admin": true,
    "email": "admin@example.com",
    "id": 1,
    "username": "admin"
  },
  "message": "Successfully logged in.",
  "status": "success"
}
```

### 10.2 - Test Exercises Endpoint

```bash
# Get auth token from previous step
TOKEN="<auth_token_from_above>"

# Test exercises endpoint
curl -s http://$API_URL:8080/exercises/ \
  -H "Authorization: Bearer $TOKEN"
```

**Output:**
```json
{
  "data": {
    "exercises": []
  },
  "status": "success"
}
```

### 10.3 - Test Scores Endpoint

```bash
curl -s http://$API_URL:8080/scores/user \
  -H "Authorization: Bearer $TOKEN"
```

**Output:**
```json
{
  "data": {
    "scores": []
  },
  "status": "success"
}
```

### 10.4 - Access Frontend

Mở browser và truy cập: `http://<FRONTEND_URL>`

**Bạn sẽ thấy:**
- ✅ Trang web hiển thị
- ✅ Có thể đăng nhập với `admin@example.com` / `123456`
- ✅ Có thể đăng nhập với `phuochv@example.com` / `123456`
- ✅ Có thể vào Dashboard
- ✅ API calls thành công (không có 500 errors)

### 10.5 - Access ArgoCD UI

Mở browser và truy cập: `http://<ARGOCD_URL>`

**Login:**
- Username: `admin`
- Password: `<ARGOCD_PASSWORD>`

**Verify:**
- ✅ Thấy 5 applications
- ✅ Tất cả đều **Healthy** và **Synced**

✅ **Checkpoint:** Application hoạt động hoàn toàn!

---

## 🎉 Hoàn Thành!

Bạn đã deploy thành công ứng dụng với:

- ✅ **EKS Cluster** (eks-1) với 2 worker nodes
- ✅ **RDS PostgreSQL** database với schema và default users
- ✅ **ArgoCD** GitOps deployment
- ✅ **5 Applications** running healthy:
  - Frontend (React)
  - API Gateway (Node.js)
  - User Management Service (Python/Flask)
  - Exercises Service (Python/Flask)
  - Scores Service (Python/Flask)
- ✅ **LoadBalancers** cho external access
- ✅ **Auto-scaling** enabled (HPA)
- ✅ **Monitoring** với health checks

**Access Information:**
- **Frontend:** `http://<FRONTEND_URL>`
- **API Gateway:** `http://<API_URL>:8080`
- **ArgoCD:** `http://<ARGOCD_URL>` (admin / `<password>`)
- **Default Accounts:**
  - Admin: `admin@example.com` / `123456`
  - User: `phuochv@example.com` / `123456`

---

## 🔄 GitOps Workflow với ArgoCD

### Update Application

Khi muốn thay đổi configuration:

```bash
# Edit Helm values
vim helm/api-gateway/values-eks.yaml

# Commit and push
git add helm/api-gateway/values-eks.yaml
git commit -m "feat: update api-gateway configuration"
git push origin main

# ArgoCD tự động sync trong ~3 phút
# Không cần chạy kubectl/helm commands!
```

### Monitor Sync

```bash
# Via CLI
kubectl get applications -n argocd -w

# Via ArgoCD UI
# Mở browser -> ArgoCD UI -> Xem real-time sync
```

### Rollback

**Via ArgoCD UI:**
1. Click vào application
2. Click **History and Rollback**
3. Chọn revision cũ
4. Click **Rollback**

**Via Git:**
```bash
git revert <commit-hash>
git push origin main
# ArgoCD tự động sync back
```

---

## 🔧 Useful Commands

### Check Application Status

```bash
# All applications
kubectl get applications -n argocd

# Specific application details
kubectl describe application api-gateway -n argocd
```

### Check Pods

```bash
# All pods in dev namespace
kubectl get pods -n dev

# Logs
kubectl logs -f <pod-name> -n dev

# Describe pod
kubectl describe pod <pod-name> -n dev
```

### Check Services

```bash
# All services
kubectl get svc -n dev

# Get LoadBalancer URLs
kubectl get svc frontend -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
kubectl get svc api-gateway -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Restart a Service

```bash
kubectl rollout restart deployment/<service-name> -n dev
```

### Force ArgoCD Sync

```bash
# Refresh application to detect changes immediately
kubectl -n argocd patch application <app-name> --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

### View Database

```bash
# Connect to database from a pod
kubectl run psql-client --rm -i --image=postgres:16-alpine --restart=Never -- \
  psql -h <RDS_ENDPOINT> -U postgres -d auth_db

# Or exec into existing pod
kubectl exec -it -n dev deployment/user-management-service -- bash
psql -h <RDS_ENDPOINT> -U postgres -d auth_db
```

---

## 🐛 Troubleshooting

### Applications showing "Progressing" in ArgoCD

**Symptoms:** ArgoCD shows applications as "Progressing" instead of "Healthy"

**Common causes:**
- Ingress resources không có address (no ALB controller)
- HPA không có metrics (no metrics-server)

**Solution:**
```bash
# Ingress resources đã được disabled trong values-eks.yaml
# Nếu vẫn còn, force refresh:
kubectl -n argocd patch application frontend --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
kubectl -n argocd patch application api-gateway --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

### Pod không start - ImagePullBackOff

**Cause:** ECR secret hết hạn hoặc không đúng

**Solution:**
```bash
# Delete old secret
kubectl delete secret ecr-secret -n dev

# Create new secret
ECR_PASSWORD=$(aws ecr get-login-password --region us-east-1)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
kubectl create secret docker-registry ecr-secret -n dev \
  --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password="$ECR_PASSWORD"

# Restart deployments
kubectl rollout restart deployment -n dev --all
```

### Database Connection Errors

**Symptoms:** Pods không connect được đến RDS

**Solution:**
```bash
# Check RDS security group allows EKS nodes
RDS_SG=$(aws rds describe-db-instances --db-instance-identifier nt114-postgres-dev --region us-east-1 --query 'DBInstances[0].VpcSecurityGroups[*].VpcSecurityGroupId' --output text)
NODE_SG=$(kubectl get nodes -o jsonpath='{.items[0].spec.providerID}' | cut -d'/' -f5 | xargs -I {} aws ec2 describe-instances --instance-ids {} --region us-east-1 --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' --output text)

# Add rule if missing
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $NODE_SG \
  --region us-east-1
```

### API 500 Errors - Schema Mismatch

**Symptoms:** API returns 500 errors, logs show `column does not exist`

**Solution:** Database schema không khớp với application models

```bash
# Delete old database job
kubectl delete job init-database migrate-database -n dev 2>/dev/null || true
kubectl delete configmap init-db-script -n dev 2>/dev/null || true

# Apply updated schema
kubectl apply -f init-db-job.yaml

# Wait for completion
kubectl get jobs -n dev -w

# Restart services
kubectl rollout restart deployment exercises-service scores-service -n dev
```

### Frontend 404 Errors

**Symptoms:** Frontend không connect được đến backend

**Cause:** Frontend nginx config có wrong API Gateway URL

**Solution:** API Gateway URL đã được configure đúng trong `helm/frontend/values-eks.yaml`

Nếu cần update:
```bash
# Get current API Gateway URL
API_URL=$(kubectl get svc api-gateway -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Edit values-eks.yaml
vim helm/frontend/values-eks.yaml
# Update: API_GATEWAY_URL: "http://<API_URL>:8080"

# Commit and push
git add helm/frontend/values-eks.yaml
git commit -m "fix: update API Gateway URL"
git push origin main

# ArgoCD auto-syncs
```

---

## 🗑️ Cleanup

### Delete Applications

```bash
# Delete via ArgoCD (recommended)
kubectl delete -f argocd/applications/

# Or delete ArgoCD itself (will delete all managed apps)
kubectl delete namespace argocd
```

### Delete Infrastructure

```bash
cd terraform/environments/dev
terraform destroy
```

**⚠️ Warning:** Terraform destroy có thể fail nếu còn ELB LoadBalancers. Xóa chúng trước:

```bash
# List LoadBalancers
aws elb describe-load-balancers --region us-east-1 --query 'LoadBalancerDescriptions[*].LoadBalancerName'

# Delete each one
aws elb delete-load-balancer --load-balancer-name <LB_NAME> --region us-east-1

# Then retry terraform destroy
terraform destroy
```

---

## 📚 Next Steps

1. **Custom Domain**: Setup Route53 + ALB Ingress Controller
2. **HTTPS**: Add SSL certificate via ACM
3. **Monitoring**: Install Prometheus & Grafana
4. **Logging**: Setup CloudWatch Logs
5. **Backup**: Automate RDS snapshots
6. **Multi-Environment**: Create staging/production environments
7. **Security**: Implement WAF, secrets encryption

---

## 📞 Support

Nếu gặp vấn đề:
1. Check logs: `kubectl logs <pod-name> -n dev`
2. Check events: `kubectl get events -n dev --sort-by='.lastTimestamp'`
3. Check ArgoCD: `kubectl get applications -n argocd`
4. Check this troubleshooting section
5. Verify prerequisites

**Important Files:**
- Database schema: `init-db-job.yaml`
- ArgoCD apps: `argocd/applications/`
- Helm values: `helm/*/values-eks.yaml`
- Terraform: `terraform/environments/dev/`

---

**🎯 Quick Summary:**

Khi đã có images trong ECR, chỉ cần:
1. ✅ Terraform apply (infrastructure)
2. ✅ kubectl config (connect to EKS)
3. ✅ Install ArgoCD
4. ✅ Create secrets (DB + ECR)
5. ✅ Fix RDS security group
6. ✅ Initialize database (Job)
7. ✅ Deploy apps (kubectl apply ArgoCD manifests)
8. ✅ Done! 🎉

Total time: ~25-30 phút
