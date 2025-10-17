# Quick Start Guide - Step by Step

Complete guide to deploy the NT114 DevSecOps project from scratch to running application.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS Account with admin access
- [ ] AWS CLI installed and configured (`aws --version`)
- [ ] Terraform >= 1.5.0 installed (`terraform --version`)
- [ ] kubectl installed (`kubectl version --client`)
- [ ] Helm >= 3.x installed (`helm version`)
- [ ] Docker installed and running (`docker --version`)
- [ ] Git installed (`git --version`)
- [ ] This repository cloned locally

## Step 1: Verify Prerequisites

```bash
# Check all tools are installed
echo "Checking prerequisites..."
aws --version
terraform --version
kubectl version --client
helm version
docker --version
git --version

# Verify AWS credentials
aws sts get-caller-identity
```

**Expected Output:**
```
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-user"
}
```

✅ **Checkpoint**: All tools installed and AWS credentials working

---

## Step 2: Configure Deployment Settings

Navigate to the project directory and run the configuration script:

```bash
cd /path/to/NT114_DevSecOps_Project

# Run configuration script
./scripts/configure-deployment.sh
```

**What happens:**
- Script detects or prompts for AWS Account ID
- Prompts for AWS region (default: us-east-1)
- Updates all Helm charts with ECR repository URLs
- Updates all ArgoCD applications
- Configures Terraform variables

**Example interaction:**
```
✓ Detected AWS Account ID: 123456789012
Use this AWS Account ID? (y/n): y
Enter AWS region (default: us-east-1): [press Enter]

Configuration:
  AWS Account ID: 123456789012
  AWS Region: us-east-1
  GitHub Repo: https://github.com/conghieu2004/NT114_DevSecOps_Project.git

Proceed with configuration update? (y/n): y

Updating Helm charts...
  ✓ Updated helm/frontend/values.yaml
  ✓ Updated helm/api-gateway/values.yaml
  ...
```

✅ **Checkpoint**: Configuration files updated with your AWS settings

---

## Step 3: Create ECR Repositories

Create Docker image repositories in AWS ECR:

```bash
./scripts/create-ecr-repos.sh
```

**What happens:**
- Creates ECR repository for each service
- Enables image scanning on push
- Sets lifecycle policy (keeps last 10 images)
- Enables encryption

**Expected Output:**
```
Creating ECR repositories...

Creating repository for frontend... ✓ Created
Creating repository for api-gateway... ✓ Created
Creating repository for user-management-service... ✓ Created
Creating repository for exercises-service... ✓ Created
Creating repository for scores-service... ✓ Created

Repository URLs:
  frontend: 123456789012.dkr.ecr.us-east-1.amazonaws.com/frontend
  api-gateway: 123456789012.dkr.ecr.us-east-1.amazonaws.com/api-gateway
  ...
```

✅ **Checkpoint**: ECR repositories created

---

## Step 4: Build and Push Docker Images

Build Docker images and push to ECR:

```bash
./scripts/build-and-push.sh
```

**What happens:**
- Logs into AWS ECR
- Builds frontend React application
- Builds all microservices
- Tags images with ECR URLs
- Pushes all images to ECR

**Expected Output:**
```
Logging in to ECR...
✓ Logged in to ECR

Building frontend...
[+] Building 45.3s (15/15) FINISHED
✓ Frontend pushed

Building api-gateway...
[+] Building 32.1s (12/12) FINISHED
✓ api-gateway pushed

...
```

**Note**: This step may take 10-15 minutes depending on your internet speed.

✅ **Checkpoint**: All Docker images built and pushed to ECR

---

## Step 5: Deploy Infrastructure with Terraform

Deploy AWS infrastructure (VPC, EKS cluster, node groups):

```bash
# Navigate to Terraform directory
cd terraform/environments/dev

# Initialize Terraform
terraform init
```

**Note**: The `providers.tf` file has been fixed to handle circular dependencies. See [PROVIDER_FIX.md](../../terraform/environments/dev/PROVIDER_FIX.md) if you encounter any provider configuration issues.

**Expected Output:**
```
Initializing modules...
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching ">= 5.0"...
- Installing hashicorp/aws v5.x.x...

Terraform has been successfully initialized!
```

```bash
# Review the plan
terraform plan
```

**Expected Output:**
```
Plan: 56 to add, 0 to change, 0 to destroy.
```

```bash
# Apply configuration
terraform apply
```

**Prompt:**
```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes
```

**What gets created:**
- VPC with public and private subnets
- NAT Gateway
- Internet Gateway
- EKS Control Plane (Kubernetes 1.31)
- EKS Managed Node Group (2 t3.large nodes)
- IAM roles and policies
- AWS Load Balancer Controller
- Security groups

**Note**: This step takes approximately 15-20 minutes.

**Expected Output:**
```
Apply complete! Resources: 56 added, 0 changed, 0 destroyed.

Outputs:

cluster_endpoint = "https://XXXXX.eks.us-east-1.amazonaws.com"
cluster_name = "eks-1"
configure_kubectl = "aws eks update-kubeconfig --region us-east-1 --name eks-1"
vpc_id = "vpc-xxxxx"
```

✅ **Checkpoint**: AWS infrastructure deployed successfully

---

## Step 6: Configure kubectl

Configure kubectl to access your EKS cluster:

```bash
aws eks update-kubeconfig --region us-east-1 --name eks-1
```

**Expected Output:**
```
Added new context arn:aws:eks:us-east-1:123456789012:cluster/eks-1 to /home/user/.kube/config
```

**Verify cluster access:**
```bash
kubectl get nodes
```

**Expected Output:**
```
NAME                            STATUS   ROLES    AGE   VERSION
ip-11-0-1-123.ec2.internal     Ready    <none>   5m    v1.31.0-eks-xxxxx
ip-11-0-2-234.ec2.internal     Ready    <none>   5m    v1.31.0-eks-xxxxx
```

**Check cluster info:**
```bash
kubectl cluster-info
```

**Expected Output:**
```
Kubernetes control plane is running at https://XXXXX.eks.us-east-1.amazonaws.com
CoreDNS is running at https://XXXXX.eks.us-east-1.amazonaws.com/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

✅ **Checkpoint**: kubectl configured and cluster accessible

---

## Step 7: Install ArgoCD

Navigate to ArgoCD directory and install:

```bash
cd ../../../argocd
./install-argocd.sh
```

**What happens:**
- Creates `argocd` namespace
- Installs ArgoCD components
- Configures LoadBalancer service
- Retrieves admin password
- Displays ArgoCD URL

**Expected Output:**
```
=====================================
Installing ArgoCD on EKS Cluster
=====================================

Creating argocd namespace...
namespace/argocd created

Installing ArgoCD...
customresourcedefinition.apiextensions.k8s.io/applications.argoproj.io created
customresourcedefinition.apiextensions.k8s.io/applicationsets.argoproj.io created
...

Waiting for ArgoCD to be ready...
deployment.apps/argocd-server condition met

=====================================
ArgoCD Installation Complete!
=====================================

Getting ArgoCD admin password...
ArgoCD Admin Password: Xy9kL2mN4pQ7rS

ArgoCD URL: https://a1b2c3d4-123456789.us-east-1.elb.amazonaws.com

Login with:
  Username: admin
  Password: Xy9kL2mN4pQ7rS
```

**⚠️ Important**: Save the admin password! You'll need it to access the UI.

**Verify ArgoCD installation:**
```bash
kubectl get pods -n argocd
```

**Expected Output:**
```
NAME                                  READY   STATUS    RESTARTS   AGE
argocd-server-xxxxx                   1/1     Running   0          2m
argocd-repo-server-xxxxx              1/1     Running   0          2m
argocd-application-controller-xxxxx   1/1     Running   0          2m
argocd-dex-server-xxxxx               1/1     Running   0          2m
argocd-redis-xxxxx                    1/1     Running   0          2m
```

✅ **Checkpoint**: ArgoCD installed and running

---

## Step 8: Access ArgoCD UI (Optional but Recommended)

Open ArgoCD UI in your browser:

1. Copy the URL from the install output
2. Open in browser: `https://<alb-url>`
3. You'll see a security warning (self-signed cert) - click "Advanced" → "Proceed"
4. Login with:
   - **Username**: `admin`
   - **Password**: (from install output)

**First Login Screen:**
- You should see the ArgoCD dashboard
- Currently showing 0 applications

✅ **Checkpoint**: ArgoCD UI accessible

---

## Step 9: Deploy Applications with ArgoCD

Deploy all microservices and frontend:

```bash
./deploy-all.sh
```

**What happens:**
- Creates ArgoCD project `nt114-devsecops`
- Deploys 5 applications:
  - frontend
  - api-gateway
  - user-management-service
  - exercises-service
  - scores-service
- ArgoCD automatically syncs from GitHub
- Kubernetes resources created

**Expected Output:**
```
=====================================
Deploying NT114 Applications to ArgoCD
=====================================

Creating ArgoCD project...
appproject.argoproj.io/nt114-devsecops created

Deploying applications...
application.argoproj.io/frontend created
application.argoproj.io/api-gateway created
application.argoproj.io/user-management-service created
application.argoproj.io/exercises-service created
application.argoproj.io/scores-service created

=====================================
Deployment Complete!
=====================================

Applications deployed:
  - frontend
  - api-gateway
  - user-management-service
  - exercises-service
  - scores-service

Check application status:
  kubectl get applications -n argocd
```

**Check deployment status:**
```bash
kubectl get applications -n argocd
```

**Expected Output:**
```
NAME                        SYNC STATUS   HEALTH STATUS
frontend                    Synced        Progressing
api-gateway                 Synced        Progressing
user-management-service     Synced        Progressing
exercises-service           Synced        Progressing
scores-service              Synced        Progressing
```

**Note**: Status will change from "Progressing" to "Healthy" in 2-3 minutes.

✅ **Checkpoint**: Applications deployed to Kubernetes

---

## Step 10: Monitor Deployment Progress

### Option A: Using kubectl

Watch pods being created:

```bash
kubectl get pods -w
```

**Expected Output:**
```
NAME                                      READY   STATUS              RESTARTS   AGE
frontend-xxxxx                            0/1     ContainerCreating   0          10s
api-gateway-xxxxx                         0/1     ContainerCreating   0          10s
user-management-service-xxxxx             0/1     ContainerCreating   0          10s
exercises-service-xxxxx                   0/1     ContainerCreating   0          10s
scores-service-xxxxx                      0/1     ContainerCreating   0          10s

# After 1-2 minutes:
frontend-xxxxx                            1/1     Running             0          2m
api-gateway-xxxxx                         1/1     Running             0          2m
...
```

Press `Ctrl+C` to stop watching.

### Option B: Using ArgoCD UI

1. Refresh the ArgoCD UI
2. You'll see 5 application cards
3. Click on any application to see detailed view
4. Watch resources being created in real-time

### Option C: Using ArgoCD CLI (if installed)

```bash
argocd app list
argocd app get frontend
```

**Wait for all pods to be Running:**
```bash
kubectl get pods
```

**Expected Final Output:**
```
NAME                                      READY   STATUS    RESTARTS   AGE
frontend-xxxxx-xxxxx                      1/1     Running   0          3m
frontend-xxxxx-xxxxx                      1/1     Running   0          3m
api-gateway-xxxxx-xxxxx                   1/1     Running   0          3m
api-gateway-xxxxx-xxxxx                   1/1     Running   0          3m
user-management-service-xxxxx-xxxxx       1/1     Running   0          3m
user-management-service-xxxxx-xxxxx       1/1     Running   0          3m
exercises-service-xxxxx-xxxxx             1/1     Running   0          3m
exercises-service-xxxxx-xxxxx             1/1     Running   0          3m
scores-service-xxxxx-xxxxx                1/1     Running   0          3m
scores-service-xxxxx-xxxxx                1/1     Running   0          3m
```

✅ **Checkpoint**: All pods running successfully

---

## Step 11: Verify Services

Check that all services are created:

```bash
kubectl get svc
```

**Expected Output:**
```
NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
frontend                    ClusterIP   172.20.100.10    <none>        80/TCP     5m
api-gateway                 ClusterIP   172.20.100.20    <none>        8080/TCP   5m
user-management-service     ClusterIP   172.20.100.30    <none>        8081/TCP   5m
exercises-service           ClusterIP   172.20.100.40    <none>        8082/TCP   5m
scores-service              ClusterIP   172.20.100.50    <none>        8083/TCP   5m
```

✅ **Checkpoint**: All services created

---

## Step 12: Check Ingress and Get Application URLs

Check ingress resources:

```bash
kubectl get ingress
```

**Expected Output:**
```
NAME          CLASS   HOSTS                   ADDRESS                                              PORTS   AGE
frontend      alb     frontend.example.com    k8s-default-frontend-xxxxx.us-east-1.elb.amazonaws.com   80      5m
api-gateway   alb     api.example.com         k8s-default-apigatewy-xxxxx.us-east-1.elb.amazonaws.com  80      5m
```

**Note**: It may take 2-3 minutes for the ALB (Application Load Balancer) to be provisioned and ADDRESS to appear.

**Get the frontend URL:**
```bash
kubectl get ingress frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

**Example Output:**
```
k8s-default-frontend-1234567890.us-east-1.elb.amazonaws.com
```

**Get the API Gateway URL:**
```bash
kubectl get ingress api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

✅ **Checkpoint**: Ingress configured and ALB URLs available

---

## Step 13: Test the Application

### Test Frontend

```bash
# Get frontend URL
FRONTEND_URL=$(kubectl get ingress frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test with curl
curl http://$FRONTEND_URL

# Or open in browser
echo "Open in browser: http://$FRONTEND_URL"
```

**Expected**: HTML content of the React application

### Test API Gateway

```bash
# Get API Gateway URL
API_URL=$(kubectl get ingress api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test health endpoint
curl http://$API_URL/health

# Test API
curl http://$API_URL/api/users
```

**Expected**: JSON response from the API

### Test from Browser

1. Open Frontend URL: `http://<frontend-alb-url>`
2. You should see the application interface
3. Try interacting with the application

✅ **Checkpoint**: Application is accessible and working

---

## Step 14: Verify Auto-Scaling

Check Horizontal Pod Autoscalers:

```bash
kubectl get hpa
```

**Expected Output:**
```
NAME                        REFERENCE                              TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
frontend                    Deployment/frontend                    15%/80%         2         10        2          10m
api-gateway                 Deployment/api-gateway                 20%/80%         2         10        2          10m
user-management-service     Deployment/user-management-service     10%/80%         2         5         2          10m
exercises-service           Deployment/exercises-service           12%/80%         2         5         2          10m
scores-service              Deployment/scores-service              8%/80%          2         5         2          10m
```

✅ **Checkpoint**: Auto-scaling configured

---

## Step 15: View Application Logs

View logs from any service:

```bash
# View frontend logs
kubectl logs -l app.kubernetes.io/name=frontend --tail=50

# View API gateway logs
kubectl logs -l app.kubernetes.io/name=api-gateway --tail=50

# Follow logs in real-time
kubectl logs -l app.kubernetes.io/name=frontend -f
```

✅ **Checkpoint**: Logs are accessible

---

## 🎉 Success! Your Application is Running

You now have:
- ✅ AWS EKS cluster running
- ✅ All microservices deployed
- ✅ Frontend accessible via ALB
- ✅ API Gateway accessible via ALB
- ✅ ArgoCD managing deployments
- ✅ Auto-scaling enabled
- ✅ Load balancing configured

## Quick Reference Commands

```bash
# Check pod status
kubectl get pods

# Check services
kubectl get svc

# Check ingress
kubectl get ingress

# View logs
kubectl logs -l app.kubernetes.io/name=<service-name>

# Describe pod (for troubleshooting)
kubectl describe pod <pod-name>

# Get events
kubectl get events --sort-by='.lastTimestamp'

# ArgoCD applications
kubectl get applications -n argocd

# Access ArgoCD UI
kubectl get svc argocd-server -n argocd
```

## Application URLs

Save these for quick access:

```bash
# Frontend
echo "Frontend: http://$(kubectl get ingress frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"

# API Gateway
echo "API Gateway: http://$(kubectl get ingress api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"

# ArgoCD UI
echo "ArgoCD: https://$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
```

## Making Changes

### Update Application Code

1. Make code changes
2. Build new Docker image:
   ```bash
   cd frontend
   docker build -t frontend:v1.1.0 .
   docker tag frontend:v1.1.0 <ECR_URL>/frontend:v1.1.0
   docker push <ECR_URL>/frontend:v1.1.0
   ```

3. Update image tag in `helm/frontend/values.yaml`:
   ```yaml
   image:
     tag: v1.1.0
   ```

4. Commit and push to GitHub
5. ArgoCD will automatically detect and deploy changes

### Manual Sync (if needed)

```bash
# Via ArgoCD UI: Click "Sync" button

# Via CLI:
kubectl patch application frontend -n argocd --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{"revision":"HEAD"}}}'
```

## Troubleshooting

See [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting) for detailed troubleshooting guide.

## Next Steps

1. **Custom Domains**: Configure Route53 for custom domains
2. **HTTPS**: Add SSL/TLS certificates
3. **Monitoring**: Install Prometheus and Grafana
4. **Logging**: Set up centralized logging
5. **Backup**: Configure backup solutions
6. **CI/CD**: Integrate with GitHub Actions for automated deployments

## Need Help?

- Check logs: `kubectl logs <pod-name>`
- Check events: `kubectl describe pod <pod-name>`
- View ArgoCD sync status in UI
- See [Documentation](README.md) for more details
