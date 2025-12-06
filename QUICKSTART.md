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

## 📚 Next Steps

1. **Custom Domain**: Setup Route53 for custom domain
2. **HTTPS**: Add SSL certificate via ACM
3. **Monitoring**: Install Prometheus & Grafana
4. **Logging**: Setup CloudWatch Logs or ELK stack
5. **CI/CD**: Automate deployments via GitHub Actions
6. **Backup**: Setup database backups
7. **Security**: Implement WAF, security groups hardening

---

## 📞 Support

Nếu gặp vấn đề:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) cho chi tiết hơn
2. Check logs: `kubectl logs <pod-name> -n dev`
3. Check events: `kubectl get events -n dev --sort-by='.lastTimestamp'`
4. Verify all prerequisites được cài đúng version
