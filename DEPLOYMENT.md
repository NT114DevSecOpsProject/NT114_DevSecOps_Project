# NT114 DevSecOps Project - Deployment Guide

Quick start guide for deploying the NT114 DevSecOps project on AWS EKS using Terraform, Helm, and ArgoCD.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     AWS Cloud                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  EKS Cluster                      │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │            ArgoCD (GitOps)                   │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────┐  ┌──────────────────────────┐  │  │
│  │  │  Frontend   │  │    API Gateway           │  │  │
│  │  │  (React)    │  │    (Port 8080)           │  │  │
│  │  └──────┬──────┘  └───────────┬──────────────┘  │  │
│  │         │                     │                  │  │
│  │         └─────────────────────┘                  │  │
│  │                     │                            │  │
│  │  ┌──────────────────┴──────────────────────┐    │  │
│  │  │         Microservices                    │    │  │
│  │  │  ┌────────────┐  ┌─────────────────┐    │    │  │
│  │  │  │   User     │  │   Exercises     │    │    │  │
│  │  │  │ Management │  │   Service       │    │    │  │
│  │  │  │ (8081)     │  │   (8082)        │    │    │  │
│  │  │  └────────────┘  └─────────────────┘    │    │  │
│  │  │  ┌────────────┐                         │    │  │
│  │  │  │   Scores   │                         │    │  │
│  │  │  │  Service   │                         │    │  │
│  │  │  │  (8083)    │                         │    │  │
│  │  │  └────────────┘                         │    │  │
│  │  └────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────┘  │
│         │                                            │
│  ┌──────▼───────────────────────────────────────┐   │
│  │  ALB (Application Load Balancer)             │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools
- **Terraform** >= 1.5.0
- **kubectl**
- **Helm** >= 3.x
- **AWS CLI** configured
- **Docker** (for building images)
- **Git**

### AWS Requirements
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- ECR repositories created for each service

### Access Requirements
- GitHub repository access
- AWS EKS permissions
- ECR push/pull permissions

## Deployment Steps

### Phase 1: Infrastructure Setup (Terraform)

#### 1.1 Navigate to Terraform Environment

```bash
cd terraform/environments/dev
```

#### 1.2 Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region      = "us-east-1"
cluster_name    = "eks-1"
cluster_version = "1.31"
# ... customize other values
```

#### 1.3 Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply configuration
terraform apply
```

This will create:
- VPC with public/private subnets
- EKS cluster (control plane)
- Managed node groups
- AWS Load Balancer Controller
- IAM roles and policies

#### 1.4 Configure kubectl

```bash
aws eks update-kubeconfig --region us-east-1 --name eks-1
```

Verify access:
```bash
kubectl get nodes
```

### Phase 2: Build and Push Docker Images

#### 2.1 Login to ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

#### 2.2 Create ECR Repositories

Use the provided script:

```bash
./scripts/create-ecr-repos.sh
```

Or manually create repositories:

```bash
for service in frontend api-gateway user-management-service exercises-service scores-service; do
  aws ecr create-repository --repository-name $service --region us-east-1
done
```

#### 2.3 Build and Push Images

Use the provided script for automated build and push:

```bash
./scripts/build-and-push.sh
```

This will:
- Build all Docker images
- Tag them with your ECR repository URLs
- Push to ECR

Or manually build and push:

**Frontend:**
```bash
cd frontend
docker build -t frontend:latest .
docker tag frontend:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/frontend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/frontend:latest
```

**Microservices:**
```bash
cd microservices

# Build and push all services
for service in api-gateway user-management-service exercises-service scores-service; do
  docker build -t $service:latest ./$service
  docker tag $service:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/$service:latest
  docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/$service:latest
done
```

### Phase 3: Deploy with ArgoCD (Recommended)

#### 3.1 Install ArgoCD

```bash
cd argocd
./install-argocd.sh
```

This will:
- Install ArgoCD in the cluster
- Display the admin password
- Show the ArgoCD UI URL

#### 3.2 Update Configuration

The GitHub repository URL is already configured to: `https://github.com/conghieu2004/NT114_DevSecOps_Project.git`

Use the configuration script to update AWS Account ID:

```bash
# Automated configuration
./scripts/configure-deployment.sh
```

This will:
- Detect or prompt for AWS Account ID
- Update all Helm values.yaml files
- Update all ArgoCD application manifests
- Configure AWS region

Or manually update:

```bash
# Update AWS account ID
find argocd/applications -name "*.yaml" -exec sed -i \
  's|<AWS_ACCOUNT_ID>|123456789012|g' {} \;
find helm -name "values.yaml" -exec sed -i \
  's|<AWS_ACCOUNT_ID>|123456789012|g' {} \;
```

#### 3.3 Deploy Applications

```bash
./deploy-all.sh
```

#### 3.4 Monitor Deployment

Access ArgoCD UI:
```
URL: https://<alb-url>
Username: admin
Password: <from install script>
```

Or via CLI:
```bash
argocd app list
argocd app get frontend
```

### Phase 4: Deploy with Helm (Alternative)

If not using ArgoCD, deploy directly with Helm:

#### 4.1 Update Helm Values

Update image repositories in each `helm/*/values.yaml`:

```yaml
image:
  repository: <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/<SERVICE_NAME>
  tag: latest
```

#### 4.2 Install Charts

```bash
# Install all services
helm install frontend ./helm/frontend
helm install api-gateway ./helm/api-gateway
helm install user-management-service ./helm/user-management-service
helm install exercises-service ./helm/exercises-service
helm install scores-service ./helm/scores-service
```

### Phase 5: Verify Deployment

#### 5.1 Check Pods

```bash
kubectl get pods
```

Expected output:
```
NAME                                      READY   STATUS    RESTARTS   AGE
frontend-xxx                              1/1     Running   0          2m
api-gateway-xxx                           1/1     Running   0          2m
user-management-service-xxx               1/1     Running   0          2m
exercises-service-xxx                     1/1     Running   0          2m
scores-service-xxx                        1/1     Running   0          2m
```

#### 5.2 Check Services

```bash
kubectl get svc
```

#### 5.3 Check Ingress

```bash
kubectl get ingress
```

Get ALB URL:
```bash
kubectl get ingress frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

#### 5.4 Test Application

```bash
# Get frontend URL
FRONTEND_URL=$(kubectl get ingress frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test frontend
curl http://$FRONTEND_URL

# Get API Gateway URL
API_URL=$(kubectl get ingress api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test API
curl http://$API_URL/health
```

## Configuration Updates

### Update Image Version

**With ArgoCD:**
```bash
# Update image tag in Git
cd helm/<service>
# Edit values.yaml, change image.tag
git commit -am "Update image tag"
git push

# ArgoCD auto-syncs
```

**With Helm:**
```bash
helm upgrade frontend ./helm/frontend --set image.tag=v2.0.0
```

### Update Environment Variables

Edit `helm/<service>/values.yaml`:

```yaml
env:
  - name: NEW_VAR
    value: "new-value"
```

Apply changes (Git push for ArgoCD, helm upgrade for Helm).

### Scale Services

```bash
# Manual scaling
kubectl scale deployment frontend --replicas=5

# Or update values.yaml
replicaCount: 5
```

## Monitoring

### View Logs

```bash
# Pod logs
kubectl logs -l app.kubernetes.io/name=frontend

# Follow logs
kubectl logs -f deployment/frontend
```

### Check Resource Usage

```bash
kubectl top nodes
kubectl top pods
```

### View Events

```bash
kubectl get events --sort-by='.lastTimestamp'
```

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check events
kubectl get events
```

### Image Pull Errors

Ensure:
1. ECR repository exists
2. Image was pushed successfully
3. EKS nodes have ECR pull permissions
4. Image tag is correct

```bash
# Check IAM role
aws eks describe-nodegroup --cluster-name eks-1 --nodegroup-name eks-node
```

### Ingress Not Working

```bash
# Check ALB controller
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check ingress
kubectl describe ingress frontend
```

### ArgoCD Out of Sync

```bash
# Check diff
argocd app diff frontend

# Force sync
argocd app sync frontend --force
```

## Cleanup

### Delete Applications

**With ArgoCD:**
```bash
argocd app delete --all
```

**With Helm:**
```bash
helm uninstall frontend api-gateway user-management-service exercises-service scores-service
```

### Delete ArgoCD

```bash
kubectl delete namespace argocd
```

### Destroy Infrastructure

```bash
cd terraform/environments/dev
terraform destroy
```

## CI/CD Integration

### GitHub Actions Workflow

The project includes GitHub Actions for:
- Terraform deployment (`.github/workflows/eks-terraform.yml`)
- Automated infrastructure updates

### Image Build Pipeline

Recommended CI/CD flow:
1. Code push triggers build
2. Docker image built and pushed to ECR
3. Update image tag in Git
4. ArgoCD auto-deploys

## Best Practices

1. **Use Tags**: Always use specific image tags, not `latest`
2. **Resource Limits**: Set appropriate CPU/memory limits
3. **Health Checks**: Implement `/health` endpoints
4. **Monitoring**: Set up Prometheus/Grafana
5. **Logging**: Use structured logging
6. **Secrets**: Use AWS Secrets Manager or Sealed Secrets
7. **Backup**: Backup important data regularly
8. **Testing**: Test in dev before prod

## Security Considerations

1. **Network Policies**: Implement Kubernetes network policies
2. **RBAC**: Configure role-based access control
3. **Secrets**: Never commit secrets to Git
4. **Image Scanning**: Scan images for vulnerabilities
5. **Updates**: Keep Kubernetes and dependencies updated
6. **Audit**: Enable audit logging

## Documentation

- [Terraform Infrastructure](terraform/README.md)
- [Helm Charts](helm/README.md)
- [ArgoCD](argocd/README.md)

## Support

For issues:
1. Check application logs
2. Review Kubernetes events
3. Check GitHub issues
4. Contact the DevSecOps team

## Quick Reference

### Common Commands

```bash
# Check cluster status
kubectl cluster-info

# Get all resources
kubectl get all

# Port forward for local testing
kubectl port-forward svc/frontend 8080:80

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/sh

# Copy files
kubectl cp <pod-name>:/path/to/file ./local/path
```

### Useful Aliases

Add to `.bashrc` or `.zshrc`:

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgi='kubectl get ingress'
alias kl='kubectl logs'
alias kd='kubectl describe'
```
