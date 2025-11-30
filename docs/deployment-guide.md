# NT114 DevSecOps Project - Deployment Guide

**Version:** 3.0
**Last Updated:** November 30, 2025
**Deployment Status:** ✅ **Complete GitOps Implementation**

---

## Executive Overview

This deployment guide provides step-by-step instructions for deploying the NT114 DevSecOps infrastructure with complete GitOps automation. The deployment process leverages AWS EKS with ArgoCD for continuous delivery, implementing modern DevSecOps practices with automated CI/CD pipelines.

### Deployment Highlights

**Single-Command Deployment**: Complete infrastructure and application deployment with one GitHub Actions workflow command
**GitOps Automation**: ArgoCD-managed applications with self-healing and automated rollback
**Production-Ready Architecture**: Multi-AZ EKS cluster with comprehensive security and monitoring
**Zero-Trust Security**: Complete security implementation with SSH key management and network isolation
**Developer Experience**: Comprehensive documentation and troubleshooting guides

---

## Quick Start

### Primary Deployment Command

```bash
# Deploy complete stack to development environment with ArgoCD
gh workflow run deploy-to-eks.yml \
  -f deployment_method=argocd \
  -f environment=dev \
  -f services=all
```

### Alternative Deployment Options

```bash
# Deploy specific services only
gh workflow run deploy-to-eks.yml \
  -f deployment_method=argocd \
  -f environment=dev \
  -f services=frontend,user-management-service

# Deploy with traditional Helm (alternative method)
gh workflow run deploy-to-eks.yml \
  -f deployment_method=helm \
  -f environment=dev \
  -f services=all

# Deploy to staging environment
gh workflow run deploy-to-eks.yml \
  -f deployment_method=argocd \
  -f environment=staging \
  -f services=all
```

### Prerequisites

#### 1. AWS Account Setup

**Create and Configure AWS Account:**
```bash
# Verify AWS account
aws sts get-caller-identity

# Expected output structure:
{
  "UserId": "AIDAEXAMPLEUSER",
  "Account": "039612870452",
  "Arn": "arn:aws:iam::039612870452:user/nt114-devsecops-github-actions-user"
}
```

**Configure IAM Permissions:**
- Administrator access for EKS, EC2, VPC, RDS, IAM
- Programmatic access for GitHub Actions
- Network and security management permissions

#### 2. GitHub Repository Setup

**Clone Repository:**
```bash
git clone https://github.com/NT114DevSecOpsProject/NT114_DevSecOps_Project.git
cd NT114_DevSecOps_Project
```

**Configure Git:**
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

#### 3. Local Development Tools

**Install Required Tools:**
```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# kubectl
curl -LO "https://dl.k8s.io/release/v1.28.0/bin/linux/amd64/kubectl" \
     https://dl.k8s.io/release/v1.28.0/kubectl.sha256
echo "$(cat kubectl.sha256)  kubectl" | sha256sum -c -
sudo chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Helm
curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar xz
sudo mv linux-amd64/helm /usr/local/bin/helm
```

**Verify Tool Installation:**
```bash
aws --version
terraform --version
kubectl version --client
helm version
```

#### 4. SSH Key Management

**Generate SSH Key Pair for Bastion Host:**
```bash
# Create new SSH key pair
DATE=$(date +%y%m%d)
KEY_NAME="nt114-bastion-devsecops-$DATE"

ssh-keygen -t ed25519 -a 100 -f $KEY_NAME -C "nt114-devsecops@$DATE" -N ""

# Verify key generation
ls -la $KEY_NAME*
ssh-keygen -lf $KEY_NAME.pub
```

**Add Public Key to GitHub Secrets:**
1. Navigate to repository settings in GitHub
2. Go to Settings → Secrets and variables → Actions
3. Create new secret named `BASTION_PUBLIC_KEY`
4. Paste content of `$KEY_NAME.pub`

**Verify Secret Configuration:**
```bash
gh secret list --repo NT114DevSecOpsProject/NT114_DevSecOps_Project | grep BASTION_PUBLIC_KEY
```

---

## Deployment Methods

### Method 1: Automated GitOps Deployment (Recommended)

#### 1. Infrastructure Deployment

**Deploy EKS Cluster:**
```bash
# Trigger infrastructure deployment
gh workflow run eks-terraform.yml \
  -f environment=dev \
  -f action=apply
```

**Monitor Infrastructure Deployment:**
```bash
# Watch deployment progress
gh run watch --job <job-id>
```

#### 2. Application Deployment with ArgoCD

**Deploy All Services:**
```bash
# Deploy complete application stack
gh workflow run deploy-to-eks.yml \
  -f deployment_method=argocd \
  -f environment=dev \
  -f services=all
```

**Deployment Process:**
1. **Infrastructure Validation**: EKS cluster availability and permissions
2. **ArgoCD Installation**: Automated ArgoCD setup with high availability
3. **Application Deployment**: 5 ArgoCD applications created and synchronized
4. **Database Setup**: Automated schema creation with PreSync hooks
5. **Ingress Creation**: HTTPS-enabled load balancers for all services
6. **Health Verification**: Comprehensive health checks and monitoring setup

#### 3. Access Applications

**Get Service URLs:**
```bash
# Get application load balancer URLs
kubectl get ingress -n dev -o wide

# Expected output:
NAME           CLASS   HOSTS                                                      ADDRESS   PORTS   AGE
frontend       alb      *-xxxx.elb.amazonaws.com                                 80        2m
api-gateway    alb      *-xxxx.elb.amazonaws.com                                 80        2m
```

**ArgoCD Access:**
```bash
# Get ArgoCD admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

# Get ArgoCD server URL
ARGOCD_URL=$(kubectl get ingress argocd-server -n argocd \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "ArgoCD URL: https://$ARGOCD_URL"
echo "Username: admin"
echo "Password: $ARGOCD_PASSWORD"
```

### Method 2: Manual Local Deployment (Alternative)

#### 1. Local Infrastructure Setup

**Initialize Terraform:**
```bash
cd terraform/environments/dev
terraform init
```

**Plan Infrastructure:**
```bash
terraform plan
```

**Apply Infrastructure:**
```bash
terraform apply
```

#### 2. Local Application Deployment

**Configure kubectl:**
```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name $(terraform output -raw cluster_name)

# Verify cluster access
kubectl get nodes
```

**Deploy Applications with Helm:**
```bash
# Update values files with AWS account ID
ACCOUNT_ID=$(terraform output -raw account_id)
for service in api-gateway user-management-service exercises-service scores-service frontend; do
  VALUES_FILE="helm/$service/values-eks.yaml"
  if [ -f "$VALUES_FILE" ]; then
    sed -i "s/\${AWS_ACCOUNT_ID}/$ACCOUNT_ID/g" "$VALUES_FILE"
  fi
done

# Deploy services
helm upgrade --install api-gateway ./helm/api-gateway \
  --namespace dev -f helm/api-gateway/values-eks.yaml

helm upgrade --install user-management-service ./helm/user-management-service \
  --namespace dev -f helm/user-management-service/values-eks.yaml

# Deploy remaining services...
```

---

## Automated Deployment Features

### 1. Pre-flight Validation

#### IAM Identity Verification
The deployment workflow automatically verifies IAM identity before deployment:

```yaml
# .github/workflows/deploy-to-eks.yml
- name: Verify IAM Identity for EKS Access
  run: |
    # Verifies current credentials match expected IAM user
    # Expected: nt114-devsecops-github-actions-user
    # Checks EKS access entries for current identity
    # Provides troubleshooting guidance if mismatched
```

**Validation Checks:**
- Current IAM user ARN verification
- EKS access entry existence check
- Automatic mismatch detection and reporting

### 2. Database Connectivity Auto-Remediation

#### Security Group Validation and Fix
Automated security group rule creation for RDS access:

```yaml
# Workflow step: Validate RDS Connectivity
- RDS instance status check (must be 'available')
- Security group ingress rule validation
- Auto-remediation: Creates missing SG rules automatically
- Connectivity test from Kubernetes pod
```

**Auto-Remediation Features:**
- Detects missing security group rules
- Automatically adds EKS cluster SG to RDS ingress
- Validates with PostgreSQL connection test
- Zero manual intervention required

**Security Group Rule Created:**
```bash
Source: EKS Cluster Security Group
Target: RDS Security Group
Protocol: TCP
Port: 5432
Description: "Allow EKS cluster access to RDS (auto-added by workflow)"
```

### 3. Universal Database Initialization

#### Automated Schema Setup Job
```yaml
# k8s/database-schema-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-schema-setup
  annotations:
    argocd.argoproj.io/hook: PreSync  # Runs before app deployment
```

**Features:**
- **Idempotent Operations**: Safe to run multiple times
- **Comprehensive Logging**: Timestamped execution logs
- **Error Handling**: Connection timeout and detailed error reporting
- **Table Verification**: Automatic schema validation
- **Template Variables**: Namespace substitution via workflow

**Database Schema Created:**
- `users` - User authentication and profiles
- `exercises` - Exercise catalog and metadata
- `user_progress` - User completion tracking
- `scores` - Performance and scoring data

### 4. ECR Token Refresh Automation

#### Scheduled Token Rotation
```yaml
# k8s/ecr-token-refresh-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
```

**Automation Features:**
- Automatic token refresh every 6 hours
- Prevents ECR authentication failures
- Uses node IAM role for AWS credentials
- Updates Kubernetes secret automatically
- Failure retry with backoff (3 attempts)

**Secret Updated:**
```bash
Name: ecr-secret
Type: docker-registry
Scope: Per-namespace
Usage: Image pull authentication
```

---

## Component Deployment Details

### 1. Infrastructure Components

#### EKS Cluster
```yaml
# terraform/environments/dev/main.tf key configurations

module "eks_cluster" {
  source = "../eks-cluster"

  cluster_name    = "eks-1"
  cluster_version = "1.28"

  vpc_id         = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  node_groups = {
    system = {
      desired_capacity = 3
      instance_types  = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
    application = {
      desired_capacity = 6
      max_capacity     = 12
      instance_types  = ["t3.xlarge"]
      capacity_type  = "SPOT"
    }
  }
}

module "eks_nodegroup" {
  source = "../eks-nodegroup"

  for each, ng in local.eks_cluster.node_groups
  content {
    cluster_name    = module.eks_cluster.cluster_name
    node_group_name = ng.key
    subnet_ids      = module.vpc.private_subnet_ids

    desired_capacity = ng.value.desired_capacity
    max_capacity     = ng.value.max_capacity
    instance_types  = ng.value.instance_types
    capacity_type  = ng.value.capacity_type

    depends_on = [module.eks_cluster]
  }
}
```

#### VPC Configuration
```yaml
# terraform/modules/vpc/main.tf key components

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Project     = "NT114-DevSecOps"
    Environment  = "dev"
  }
}

resource "aws_subnet" "public" {
  for_each, az in ["us-east-1a", "us-east-1b", "us-east-1c"]
  content {
    vpc_id                  = aws_vpc.main.id
    cidr_block              = "10.0.${1 + 1 + index(az) }.0.0/24"
    availability_zone       = az
    map_public_ip_on_launch = true

    tags = {
      Name = "nt114-devsecops-public-${az}"
      Type = "Public"
    }
  }
}

resource "aws_subnet" "private" {
  for_each, az in ["us-east-1a", "us-east-1b", "us-east-1c"]
  content {
    vpc_id                  = aws_vpc.main.id
    cidr_block              = "10.0.10 + ${10 * (index(az) + 1) }.0/24"
    availability_zone       = az

    tags = {
      Name = "nt114-devsecops-private-${az}"
      Type = "Private"
    }
  }
}
```

### 2. ArgoCD GitOps Deployment

#### ArgoCD Installation
```yaml
# .github/workflows/deploy-to-eks.yml ArgoCD installation steps

- name: Install ArgoCD
  if: inputs.deployment_method == 'argocd'
  run: |
    # Check if ArgoCD namespace exists
    if ! kubectl get namespace argocd &>/dev/null; then
      echo "ArgoCD namespace not found, creating..."
      kubectl create namespace argocd
    fi

    # Add ArgoCD Helm repository
    helm repo add argo https://argoproj.github.io/argo-helm
    helm repo update

    # Install ArgoCD with production values
    helm upgrade --install argocd argo/argo-cd \
      --namespace argocd \
      --set server.service.type=ClusterIP \
      --set server.ingress.enabled=false \
      --set server.config.tls.minVersion=VersionTLS12 \
      --set configs.params."server\.insecure"=false \
      --wait --timeout 10m
```

#### ArgoCD Applications Configuration
```yaml
# argocd/argocd-applications.yaml structure

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-management-service
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/NT114DevSecOpsProject/NT114_DevSecOps_Project.git
    targetRevision: main
    path: helm/user-management-service
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
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### 3. Database Schema Automation

#### Database Schema Job with PreSync Hook
```yaml
# k8s/database-schema-job.yaml

apiVersion: batch/v1
kind: Job
metadata:
  name: database-schema-setup
  namespace: dev
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    metadata:
      name: database-schema-setup
    spec:
      restartPolicy: OnFailure
      containers:
      - name: schema-setup
        image: python:3.9-slim
        command:
        - /bin/bash
        - -c
        - |
          set -e
          echo "Installing dependencies..."
          pip install -q psycopg2-binary

          echo "Running database schema setup..."
          python3 << 'SCRIPT'
          import os
          import psycopg2

          try:
              conn = psycopg2.connect(
                  host=os.environ['DB_HOST'],
                  port=int(os.environ['DB_PORT']),
                  database='postgres',
                  user=os.environ['DB_USER'],
                  password=os.environ['DB_PASSWORD']
              )
              conn.autocommit = True
              cursor = conn.cursor()

              # Create database if not exists
              cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'auth_db'")
              if not cursor.fetchone():
                  cursor.execute('CREATE DATABASE auth_db')
                  print('✅ Database auth_db created')
              else:
                  print('✅ Database auth_db already exists')

              cursor.close()
              conn.close()

              # Connect to auth_db and create tables
              conn = psycopg2.connect(
                  host=os.environ['DB_HOST'],
                  port=int(os.environ['DB_PORT']),
                  database='auth_db',
                  user=os.environ['DB_USER'],
                  password=os.environ['DB_PASSWORD']
              )
              cursor = conn.cursor()

              # Users table
              cursor.execute('''
                  CREATE TABLE IF NOT EXISTS users (
                      id SERIAL PRIMARY KEY,
                      email VARCHAR(255) UNIQUE NOT NULL,
                      password_hash VARCHAR(255) NOT NULL,
                      full_name VARCHAR(255),
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      is_active BOOLEAN DEFAULT TRUE
                  )
              ''')
              print('✅ Users table created')

              # Exercises table
              cursor.execute('''
                  CREATE TABLE IF NOT EXISTS exercises (
                      id SERIAL PRIMARY KEY,
                      title VARCHAR(255) NOT NULL,
                      description TEXT,
                      difficulty_level INTEGER DEFAULT 1,
                      category VARCHAR(100),
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                  )
              ''')
              print('✅ Exercises table created')

              conn.commit()
              print('✅ All database tables created successfully!')

          except Exception as e:
              print(f'❌ Error: {e}')
              exit(1)
          finally:
              if 'conn' in locals():
                  conn.close()
          SCRIPT
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: user-management-db-secret
              key: DB_HOST
        - name: DB_PORT
          valueFrom:
            secretKeyRef:
              name: user-management-db-secret
              key: DB_PORT
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: user-management-db-secret
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: user-management-db-secret
              key: DB_PASSWORD
```

### 4. ECR Token Management

#### Automated ECR Token Refresh
```yaml
# k8s/ecr-token-refresh-cronjob.yaml

apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
  namespace: dev
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 3
      template:
        metadata:
          name: ecr-token-refresh
        spec:
          restartPolicy: OnFailure
          containers:
          - name: refresh-token
            image: amazon/aws-cli:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e
              echo "Refreshing ECR token..."

              # Get ECR login token
              TOKEN=$(aws ecr get-login-password --region ${AWS_REGION})

              # Update secret
              kubectl create secret docker-registry ecr-secret \
                --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
                --docker-username=AWS \
                --docker-password=$TOKEN \
                --namespace=${K8S_NAMESPACE} \
                --dry-run=client -o yaml | kubectl apply -f -

              echo "✅ ECR secret refreshed at $(date)"
            env:
            - name: AWS_REGION
              value: "us-east-1"
            - name: AWS_ACCOUNT_ID
              value: "039612870452"
            - name: K8S_NAMESPACE
              value: "dev"
```

---

## Access and Authentication

### 1. SSH Bastion Host Access

#### Connect to Bastion Host
```bash
# Using the generated SSH key
ssh -i nt114-bastion-devsecops-251130 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  ec2-user@<bastion-public-ip>

# Verify SSH access
# Expected welcome message for Amazon Linux 2
```

#### Bastion Host Management
```bash
# Add your public SSH key to bastion host
# (Done automatically during infrastructure deployment)

# Verify key file exists on bastion
ssh ec2-user@<bastion-ip> "ls -la ~/.ssh/authorized_keys"
```

### 2. Database Access

#### Local Database Access
```bash
# Connect via bastion host
ssh -i nt114-bastion-devsecops-251130 ec2-user@<bastion-ip> \
  "psql -h nt114-postgres-dev.cy7o684ygirj.us-east-1.rds.amazonaws.com -U postgres -d auth_db"

# Connect with connection string
psql "postgresql://postgres:postgres@nt114-postgres-dev.cy7o684ygirj.us-east-1.rds.amazonaws.com:5432/auth_db"
```

#### Application Database Access
```bash
# Applications connect through Kubernetes services
kubectl port-forward service/user-management-service 5432:5432 -n dev
psql "postgresql://postgres:postgres@localhost:5432/auth_db"
```

### 3. ArgoCD Access

#### ArgoCD Web UI Access
```bash
# Get ArgoCD password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

# Port-forward ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access ArgoCD UI
# Navigate to: https://localhost:8080
# Username: admin
# Password: $ARGOCD_PASSWORD
```

#### ArgoCD CLI Access
```bash
# Configure ArgoCD CLI
argocd login <argocd-server-url> --username admin --password $ARGOCD_PASSWORD

# List applications
argocd app list
```

### 4. Application URLs

#### Get Application URLs
```bash
# Get all ingress URLs
kubectl get ingress -n dev -o wide

# Expected output
NAME           CLASS   HOSTS                                                      ADDRESS   PORTS   AGE
frontend       alb      *-xxxxxxxx.us-east-1.elb.amazonaws.com                      80        5m
api-gateway    alb      *-xxxxxxxx.us-east-1.elb.amazonaws.com                      80        5m
```

#### Test Application Endpoints
```bash
# Test frontend
curl -I http://<frontend-url>/health

# Test API Gateway
curl -I http://<api-gateway-url>/health

# Test specific service endpoints
curl -I http://<api-gateway-url>/users/health
curl -I http://<api-gateway-url>/exercises/health
curl -I http://<api-gateway-url>/scores/health
```

---

## Monitoring and Validation

### 1. Infrastructure Health Checks

#### EKS Cluster Status
```bash
# Check cluster health
kubectl cluster-info

# Check node status
kubectl get nodes -o wide

# Check system pods
kubectl get pods -n kube-system

# Check ALB controller
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

#### Application Health Monitoring
```bash
# Check application pods
kubectl get pods -n dev

# Check service status
kubectl get services -n dev

# Check ingress resources
kubectl get ingress -n dev -o wide

# Check application health endpoints
for service in frontend api-gateway user-management-service exercises-service scores-service; do
  echo "Checking $service health..."
  kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=$service -n dev --timeout=300s
  if [ $? -eq 0 ]; then
    echo "✅ $service is ready"
  else
    echo "❌ $service health check failed"
  fi
done
```

### 2. Performance Monitoring

#### Resource Utilization
```bash
# Check node resource usage
kubectl top nodes

# Check pod resource usage
kubectl top pods -n dev

# Check resource quotas
kubectl describe quota
```

#### Monitoring Stack
```bash
# ArgoCD application status
kubectl get applications -n argocd -o wide

# ArgoCD synchronization status
argocd app get <app-name> -n argocd

# CloudWatch metrics (if enabled)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EKS \
  --metric-name ClusterResourceUsage \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)
```

---

## Troubleshooting Guide

### 1. GitHub Actions Issues

#### AWS Credentials Issues
```bash
# Symptom: "Unable to locate credentials"
# Solution: Verify AWS secrets in GitHub repository
gh secret list --repo NT114DevSecOpsProject/NT114_DevSecOps_Project

# Test AWS credentials
aws sts get-caller-identity

# Expected IAM user: nt114-devsecops-github-actions-user
```

#### Workflow Permission Issues
```bash
# Check workflow permissions
gh auth status

# Verify repository access
gh api user

# Check organization membership
gh api orgs
```

### 2. Infrastructure Issues

#### EKS Cluster Access
```bash
# Symptom: "EKS cluster not found" or authentication failed
# Solution 1: Verify cluster exists
aws eks describe-cluster --name eks-1 --region us-east-1

# Solution 2: Check IAM user permissions
aws eks list-access-entries \
  --cluster-name eks-1 \
  --region us-east-1

# Solution 3: Update kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name eks-1

# Test cluster access
kubectl cluster-info
```

#### Node Group Issues
```bash
# Symptom: "Node instances not joining cluster"
# Solution 1: Check subnet tagging
aws ec2 describe-instances \
  --filters "Name=tag:eks:cluster-name,Values=eks-1" \
  --query 'Instances[*].[InstanceId,Tags[?Key==`kubernetes.io/cluster/eks-1`].Value]'

# Solution 2: Check IAM role for node group
aws iam get-role-policy \
  --role-name arn:aws:iam::039612870452:role/eks-1-nodegroup-ng-xxxxxx

# Solution 3: Check security group rules
aws ec2 describe-security-groups \
  --group-ids sg-xxxxxxxxx
```

#### ALB Controller Issues
```bash
# Symptom: "Ingress resources not creating ALBs"
# Solution 1: Check ALB controller pod logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=50

# Solution 2: Verify IAM role setup
kubectl describe serviceaccount aws-load-balancer-controller -n kube-system

# Solution 3: Check subnet tagging
aws ec2 describe-subnets \
  --subnet-ids subnet-xxxxxxxxx \
  --query 'Subnets[*].Tags[?Key==`kubernetes.io/cluster/eks-1`]'
```

### 3. Application Issues

#### Pod Crash Loop
```bash
# Check pod status
kubectl get pods -n dev

# Describe problematic pod
kubectl describe pod <pod-name> -n dev

# Check pod logs
kubectl logs <pod-name> -n dev --tail=100

# Check events
kubectl get events -n dev --sort-by='.lastTimestamp' | tail -20
```

#### Service Connectivity Issues
```bash
# Check service endpoints
kubectl get endpoints -n dev

# Test service connectivity
kubectl run test-pod --image=curlimages/curl -n dev --rm -i --restart=Never \
  -- curl http://<service-name>.dev.svc.cluster.local:<port>

# Check network policies
kubectl get networkpolicy -n dev
```

#### Database Connection Issues
```bash
# Check database secret
kubectl get secret user-management-db-secret -n dev -o yaml

# Test database connectivity from pod
kubectl run db-test --image=postgres:15-alpine --rm -i -n dev \
  --env="PGHOST=<host>" \
  --env="PGPORT=<port>" \
  --env="PGUSER=<user>" \
  --env="PGPASSWORD=<password>" \
  -- psql -h $PGHOST -p $PGPORT -U $PGUSER -d postgres

# Check ECR token
kubectl get secret ecr-secret -n dev -o yaml

# Manually refresh ECR token if needed
kubectl create job --from=cronjob/ecr-token-refresh -n dev manual-token-refresh
```

### 4. ArgoCD Issues

#### Application Sync Issues
```bash
# Check ArgoCD application status
kubectl get applications -n argocd -o wide

# Force refresh application
argocd app refresh <app-name> -n argocd

# Check application synchronization details
argocd app get <app-name> -n argocd

# Retry failed application
argocd app retry <app-name> -n argocd

# Rollback application
argocd app rollback <app-name> -n argocd
```

#### ArgoCD Server Issues
```bash
# Check ArgoCD server pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# Check ArgoCD server logs
kubectl logs -n argocd deployment/argocd-server --tail=50

# Restart ArgoCD server
kubectl rollout restart deployment/argocd-server -n argocd
```

### 5. Performance Issues

#### High Resource Usage
```bash
# Check resource utilization
kubectl top nodes
kubectl top pods -n dev

# Check resource limits and requests
kubectl describe pods -n dev | grep -A5 -B5 "Limits:\|Requests:"

# Scale down resources if needed
kubectl patch deployment <deployment-name> -n dev \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container-name>","resources":{"limits":{"cpu":"500m","memory":"512Mi"}}}}}}}'
```

#### Slow Response Times
```bash
# Check application latency
kubectl exec -it <pod-name> -n dev -- curl -w "time_total=%{time_total}" -o /dev/stdout \
  http://localhost:<port>/health

# Check database performance
kubectl exec -it <db-pod> -n dev -- psql -c "
SELECT query, execution_time
FROM pg_stat_statements
WHERE query LIKE '%health%'
ORDER BY mean_exec_time DESC
LIMIT 10;
" -d <database>
```

---

## Maintenance and Updates

### 1. Regular Maintenance Tasks

#### Weekly Infrastructure Check
```bash
#!/bin/bash
# weekly-infrastructure-check.sh

echo "Starting weekly infrastructure check..."

# Check EKS cluster health
echo "Checking EKS cluster health..."
kubectl cluster-info

# Check node status
echo "Checking node status..."
kubectl get nodes

# Check application health
echo "Checking application health..."
kubectl get pods -n dev

# Check backup status
echo "Checking backup status..."
# Add backup verification logic here

echo "Weekly infrastructure check completed"
```

#### Monthly Security Updates
```bash
#!/bin/bash
# monthly-security-updates.sh

echo "Starting monthly security updates..."

# Update Kubernetes version
echo "Checking for Kubernetes updates..."
kubectl version --client

# Update AWS CLI
echo "Updating AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Check for security advisories
echo "Checking for security advisories..."
# Add security scanning logic here

echo "Monthly security updates completed"
```

### 2. Application Updates

#### Update Application Images
```bash
# Update application images
echo "Building new application images..."

# Build and push images to ECR
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/nt114-devsecops/<service>:latest ./helm/<service>
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/nt114-devsecops/<service>:latest

# Trigger ArgoCD sync
argocd app sync <service> -n argocd

echo "Application update completed"
```

### 3. Scaling Operations

#### Scale Up Applications
```bash
# Scale up for increased load
kubectl scale deployment user-management-service --replicas=5 -n dev

# Scale down for cost optimization
kubectl scale deployment user-management-service --replicas=2 -n dev

# Monitor scaling progress
kubectl rollout status deployment/user-management-service -n dev
```

---

## Support and Emergency Procedures

### 1. Support Contacts

#### Development Team
- **DevOps Engineer**: Infrastructure and automation
- **Backend Developers**: Service development and maintenance
- **Frontend Developer**: Application development
- **Security Engineer**: Security implementation and compliance

#### Emergency Contacts
- **Critical Incident**: PagerDuty on-call rotation
- **Security Incident**: Security team hotline
- **Infrastructure Issue**: DevOps team escalation

### 2. Incident Response Procedures

#### Security Incident Response
1. **Detection**: Monitor security alerts and logs
2. **Assessment**: Evaluate incident scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore services and data
6. **Documentation**: Document lessons learned

#### Infrastructure Failure Response
1. **Identify**: Determine affected components
2. **Isolate**: Prevent cascading failures
3. **Recover**: Restore from backups or redeploy
4. **Verify**: Confirm system functionality
5. **Review**: Analyze root causes and improve procedures

### 3. Data Recovery Procedures

#### Database Recovery
```bash
# Point-in-time database recovery
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier restored-db \
  --db-snapshot-identifier <snapshot-id> \
  --use-latest-restorable-time

# Verify database integrity
kubectl run postgres-verification --image=postgres:15-alpine -n dev \
  --env="PGHOST=<restored-db-endpoint>" \
  --env="PGPASSWORD=<restored-password>"
```

#### Infrastructure Recovery
```bash
# Recover from Terraform state backup
terraform state pull > backup-state.tfstate

# Restore infrastructure
terraform apply -state=backup-state.tfstate

# Verify recovery
terraform output cluster_name
kubectl get nodes
```

---

## Cost Optimization

### 1. Resource Rightsizing

#### Monitor Resource Utilization
```bash
# Check current resource usage
kubectl top nodes -n dev
kubectl top pods -n dev

# Identify underutilized resources
kubectl describe nodes
```

#### Scale Down Strategy
```bash
# Reduce node group sizes
# Update desired_capacity in terraform/environments/dev/main.tf

terraform plan -target=module.eks_cluster.node_groups.application
terraform apply
```

### 2. Storage Optimization

#### EBS Volume Optimization
```bash
# Check volume usage
kubectl get pv -n dev -o wide

# Delete unused volumes
kubectl delete pv <unused-pv-name> -n dev

# Implement volume lifecycle policies
# Update Terraform configuration for automatic cleanup
```

### 3. Spot Instance Usage

#### Current Spot Instance Benefits
- **70% cost reduction** compared to on-demand instances
- **Automatic replacement** when instances are reclaimed
- **Multiple instance types** for optimal pricing
- **Interruption handling** with graceful pod termination

#### Monitoring Spot Instance Usage
```bash
# Check spot instance termination notices
kubectl get events -n dev --field-selector reason=TerminationBySpotInstance

# Monitor cost savings
aws ce get-cost-and-usage \
  --time-period P30D \
  --group-by Service
```

---

## Security Best Practices

### 1. SSH Key Management

#### Current SSH Implementation
- **ED25519 key algorithm** with 100 KDF rounds
- **Quarterly rotation schedule** with automated procedures
- **GitHub secrets storage** for public key distribution
- **Bastion host isolation** with minimal attack surface
- **Comprehensive access logging** via AWS CloudTrail

#### SSH Key Rotation Procedure
```bash
# Generate new key (quarterly or as needed)
DATE=$(date +%y%m%d)
NEW_KEY_NAME="nt114-bastion-devsecops-$DATE"

ssh-keygen -t ed25519 -a 100 -f $NEW_KEY_NAME \
  -C "nt114-devsecops@$DATE" -N ""

# Test new key locally before deployment
ssh-keygen -lf $NEW_KEY_NAME.pub
```

### 2. Network Security

#### VPC Security Configuration
- **Private subnets** for all application workloads
- **Security groups** with least-privilege access
- **Network ACLs** for additional network protection
- **NAT gateways** for controlled outbound access
- **VPC flow logs** for network monitoring

#### Security Group Rules
```yaml
# Terraform security group configurations

# Bastion host security group
resource "aws_security_group" "bastion_sg" {
  name        = "nt114-bastion-sg"
  description = "Security group for bastion hosts"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Restrict to corporate IPs
    description = "SSH access from corporate network"
  }
}

# EKS worker node security group
resource "aws_security_group" "eks_node_sg" {
  name        = "nt114-eks-node-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Allow all traffic within VPC"
  }
}
```

### 3. IAM Security

#### IAM Role Configuration
```yaml
# GitHub Actions IAM role
data "aws_iam_policy" "github_actions_policy" {
  name = "NT114GitHubActionsPolicy"
  description = "Policy for GitHub Actions"

  statement = [
    {
      Effect = "Allow",
      Action = [
        "eks:*",
        "ec2:*",
        "elasticloadbalancing:*",
        "autoscaling:*",
        "cloudwatch:*",
        "logs:*",
        "ssm:*",
        "ecr:*",
        "rds:*"
      ],
      Resource = "*"
      Condition = {
        StringEquals = {
          "aws:PrincipalTag": "GitHub"
        }
      }
    }
  ]
}

# EKS node IAM role
data "aws_iam_role" "eks_node_role" {
  name = "nt114-eks-node-role"
  assume_role_policy = aws_iam_policy.github_actions_policy.arn
  managed_policy_arns = [
    "arn:aws:policy::AmazonEKSClusterPolicy"
  ]
}
```

### 4. Container Security

#### Multi-Stage Docker Builds
```dockerfile
# Multi-stage build pattern for secure, minimal images

FROM python:3.9-slim as base

# Install dependencies
RUN pip install --no-cache-dir \
    psycopg2-binary \
    flask \
    gunicorn

# Create non-root user
RUN useradd -m -u appuser appuser

# Copy application code
COPY . /app
USER appuser

# Secure application
EXPOSE 5000
USER appuser
```

#### Image Security Scanning
```bash
# Scan images for vulnerabilities
docker scan --format json $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/nt114-devsecops/user-management:latest

# Find and fix high severity issues
docker run --rm -v /var/run/docker.sock \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec trivy image \
  --exit-code 1 \
  --severity HIGH,CITICAL \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/nt114-devsecops/user-management:latest
```

---

## Performance Optimization

### 1. Application Performance

#### Response Time Targets
- **Frontend**: < 2 seconds initial load
- **API Gateway**: < 500ms average response time
- **Microservices**: < 200ms for internal API calls
- **Database**: < 100ms query response time

#### Caching Implementation
```yaml
# Redis caching configuration
apiVersion: v1
kind: Deployment
metadata:
  name: redis-cache
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-cache
  template:
    metadata:
      labels:
        app: redis-cache
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
```

### 2. Database Performance

#### Connection Pooling
```python
# Application database connection configuration
import psycopg2
from psycopg2 import pool

DATABASE_URL = os.environ.get('DATABASE_URL')

# Create connection pool
connection_pool = psycopg2.pool.SimpleConnectionPool(
    minconn=2,
    maxconn=20,
    dsn=DATABASE_URL
)

def get_db_connection():
    return connection_pool.getconn()
```

#### Query Optimization
```sql
# Optimized database queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty_level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scores_user_exercise ON scores(user_id, exercise_id);
```

### 3. Auto Scaling Configuration

#### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-management-hpa
  namespace: dev
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-management-service
  namespace: dev
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
      - type: Resource
        resource:
          name: memory
          target:
            type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: PodsUnavailable
      - type: PodDisruptionBudget
```

#### Cluster Autoscaler
```yaml
# AWS Auto Scaling Group configuration
resource "aws_autoscaling_group" "application_asg" {
  name                = "nt114-dev-asg"
  vpc_zone_identifier = aws_subnet.private[0].availability_zone
  min_size            = 2
  max_size            = 10
  desired_capacity    = 4
  target_group_arns   = [aws_eks_node_group.ng-node-group.arn]
  health_check_type    = "EC2"
  health_check_grace_period = 60
  default_cooldown       = 300
  protected_instances   = 0
  instance_types        = ["t3.large"]
  mixed_instances_policy = "spot"
}
```

---

## Backup and Disaster Recovery

### 1. Database Backup Strategy

#### Automated Backups
```yaml
# AWS RDS backup configuration
resource "aws_db_instance" "main_database" {
  identifier = "nt114-postgres-dev"

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  delete_automated_backups = true
  skip_final_snapshot  = false
  final_snapshot_identifier = false

  tags = {
    Environment = "dev",
    Project = "NT114-DevSecOps"
    Backup = "Automated"
  }
}
```

#### Backup Validation
```bash
# Daily backup verification
#!/bin/bash

# Get latest backup
LATEST_BACKUP=$(aws rds describe-db-snapshots \
  --db-instance-identifier nt114-postgres-dev \
  --query 'Snapshots[*].[SnapshotIdentifier]' \
  --sort-by SnapshotTime \
  --order desc \
  --output text | head -1)

# Verify backup exists
aws rds describe-db-snapshots \
  --db-instance-identifier nt114-postgres-dev \
  --db-snapshot-identifier $LATEST_BACKUP \
  --output table

echo "Latest backup: $LATEST_BACKUP"
echo "Backup verification completed"
```

### 2. Disaster Recovery Procedures

#### Complete Infrastructure Recovery
```bash
# Disaster recovery script
#!/bin/bash

echo "Starting disaster recovery process..."

# 1. Assess damage
echo "Assessing infrastructure damage..."
aws eks describe-cluster --name eks-1

# 2. Recover from backups
echo "Recovering from latest backup..."
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier nt114-postgres-dev-recovered \
  --db-snapshot-identifier <latest-snapshot-id> \
  --use-latest-restorable-time

# 3. Restore Kubernetes resources
echo "Restoring Kubernetes resources..."
kubectl apply -f k8s/disaster-recovery/

# 4. Validate recovery
echo "Validating system recovery..."
kubectl get pods -n dev
kubectl get services -n dev

echo "Disaster recovery completed"
```

#### Recovery Time Objectives (RTO/RPO)
- **Infrastructure**: 1 hour
- **Applications**: 15 minutes
- **Database**: 1 hour (point-in-time)
- **DNS**: 5 minutes
- **Data Loss**: < 15 minutes (RPO)

---

## Monitoring and Observability

### 1. Application Monitoring

#### Health Check Implementation
```python
# Flask application health check endpoint
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'service': os.getenv('SERVICE_NAME', 'unknown'),
        'dependencies': check_dependencies()
    })

def check_dependencies():
    # Add dependency checking logic
    dependencies = {}

    # Check database connectivity
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        dependencies['database'] = 'healthy'
    except Exception as e:
        dependencies['database'] = 'unhealthy'
        dependencies['database_error'] = str(e)

    return dependencies
```

### 2. Metrics Collection

#### Prometheus Metrics
```python
# Application metrics with Prometheus
from prometheus_client import Counter, Histogram, Gauge

# Define metrics
REQUEST_COUNT = Counter('http_requests_total', 'Number of HTTP requests')
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')
ACTIVE_USERS = Gauge('active_users', 'Number of active users')

@app.before_request
def before_request():
    REQUEST_COUNT.inc()

@app.after_request
def after_request(response):
    REQUEST_LATENCY.observe(time.time() - request.start_time)
```

### 3. Logging Strategy

#### Structured Logging
```python
# Structured JSON logging
import json
import logging
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'service': os.getenv('SERVICE_NAME', 'unknown'),
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'trace_id': getattr(record, 'trace_id', 'no-trace-id'),
            'user_id': getattr(record, 'user_id', 'anonymous'),
            'correlation_id': getattr(record, 'correlation_id', None)
        }
        return json.dumps(log_entry)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format=JSONFormatter()
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/app/logs/app.log')
    ]
)
```

---

## Conclusion

### Deployment Success Verification

After following this deployment guide, you will have:

1. **Complete Infrastructure**: Production-ready EKS cluster with all supporting services
2. **GitOps Automation**: ArgoCD-managed applications with self-healing capabilities
3. **Zero-Trust Security**: Comprehensive security implementation at all layers
4. **High Availability**: Multi-AZ deployment with automated failover
5. **Comprehensive Monitoring**: End-to-end observability and alerting
6. **Cost Optimization**: Efficient resource utilization with spot instances

### Next Steps

1. **Production Deployment**: Deploy to production environment using same procedures
2. **Enhanced Monitoring**: Implement advanced monitoring and alerting
3. **Performance Optimization**: Fine-tune application and database performance
4. **Security Hardening**: Implement additional security controls and compliance
5. **Disaster Recovery Testing**: Regular disaster recovery drills

### Support Resources

For deployment issues or questions:
- **Documentation**: Refer to project documentation in `./docs/` directory
- **GitHub Issues**: Create issues in the repository
- **Team Contact**: Contact the development team through established channels
- **Emergency Procedures**: Follow documented incident response procedures

**Deployment Status**: ✅ Production Ready with Complete GitOps Implementation

---

**Document Version**: 3.0
**Last Updated**: November 30, 2025
**Next Review**: December 31, 2025
**Status**: ✅ Complete Implementation with Documentation

---

## Overview

This guide provides comprehensive instructions for deploying the NT114 DevSecOps infrastructure on AWS. The deployment uses Infrastructure as Code (IaC) with Terraform and automated CI/CD pipelines via GitHub Actions.

**Prerequisites:**
- AWS Account with appropriate permissions
- GitHub repository access
- Basic knowledge of AWS, Kubernetes, and Terraform
- Local development environment with required tools

---

## Table of Contents

1. [Prerequisites and Setup](#prerequisites-and-setup)
2. [SSH Key Management](#ssh-key-management)
3. [Infrastructure Deployment](#infrastructure-deployment)
4. [Application Deployment](#application-deployment)
5. [Database Migration](#database-migration)
6. [Monitoring and Validation](#monitoring-and-validation)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance and Updates](#maintenance-and-updates)

---

## Prerequisites and Setup

### 1. Required Tools and Accounts

#### AWS Account Setup
```bash
# Verify AWS account
aws sts get-caller-identity

# Expected output:
# {
#     "UserId": "AIDA...",
#     "Account": "039612870452",
#     "Arn": "arn:aws:iam::039612870452:user/your-username"
# }
```

#### Local Development Tools
```bash
# Install required tools
# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform
wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform_1.6.6_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# GitHub CLI
sudo apt update && sudo apt install gh -y
```

#### Verification
```bash
# Verify tool installations
aws --version
terraform --version
kubectl version --client
gh --version
```

### 2. AWS IAM Configuration

#### GitHub Actions IAM User
Create IAM user `nt114-devsecops-github-actions-user` with the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:*",
                "ec2:*",
                "ecr:*",
                "iam:*",
                "elasticloadbalancing:*",
                "autoscaling:*",
                "cloudwatch:*",
                "logs:*",
                "ssm:*",
                "kms:*",
                "rds:*",
                "s3:*"
            ],
            "Resource": "*"
        }
    ]
}
```

#### Generate Access Keys
```bash
# Using AWS CLI
aws iam create-access-key --user-name nt114-devsecops-github-actions-user
```

---

## SSH Key Management

### 1. Generate SSH Key Pair for Bastion Host

#### Create ED25519 SSH Key
```bash
# Generate new SSH key pair
DATE=$(date +%y%m%d)
KEY_NAME="nt114-bastion-devsecops-$DATE"

ssh-keygen -t ed25519 -a 100 -f $KEY_NAME -C "nt114-bastion-devsecops@$DATE" -N ""

# Verify key generation
ls -la $KEY_NAME*
ssh-keygen -lf $KEY_NAME.pub
```

#### Current Active Key
The current active SSH key (already implemented):
- **Key Name**: `nt114-bastion-devsecops-251114`
- **Fingerprint**: `SHA256:edYlordmWrJ5GmginvuV/VDKrxX+lxNWPGokC1vTxjM`
- **Public Key**: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGZqGfDpgsV81imXTwMHylKPckIQyoa1Acu4pQOJ/jzB nt114-bastion-devsecops@251114`

### 2. Configure GitHub Secrets

#### Method 1: GitHub CLI (Recommended)
```bash
# Authenticate with GitHub CLI
gh auth login

# Set repository secrets
gh secret set BASTION_PUBLIC_KEY \
  --repo NT114DevSecOpsProject/NT114_DevSecOps_Project \
  --body "$(cat nt114-bastion-devsecops-251114.pub)"

# Verify secret creation
gh secret list --repo NT114DevSecOpsProject/NT114_DevSecOps_Project
```

#### Method 2: GitHub Web UI
1. Navigate to repository settings
2. Go to "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Set name: `BASTION_PUBLIC_KEY`
5. Paste the public key content
6. Click "Add secret"

### 3. SSH Key Rotation Procedures

#### Quarterly Rotation Schedule
```bash
#!/bin/bash
# ssh-key-rotation.sh

# Generate new key
NEW_DATE=$(date +%y%m%d)
NEW_KEY_NAME="nt114-bastion-devsecops-$NEW_DATE"

ssh-keygen -t ed25519 -a 100 -f $NEW_KEY_NAME -C "nt114-bastion-devsecops@$NEW_DATE" -N ""

# Test new key locally
ssh-keygen -lf $NEW_KEY_NAME.pub

# Update GitHub secret
gh secret set BASTION_PUBLIC_KEY \
  --repo NT114DevSecOpsProject/NT114_DevSecOps_Project \
  --body "$(cat $NEW_KEY_NAME.pub)"

echo "SSH key rotation completed. New key: $NEW_KEY_NAME"
echo "Remember to update infrastructure deployment to use new key."
```

#### Emergency Rotation (Compromise Response)
```bash
#!/bin/bash
# emergency-key-rotation.sh

# Generate emergency key
EMERG_DATE=$(date +%y%m%d)
EMERG_KEY_NAME="nt114-bastion-devsecops-$EMERG_DATE-emergency"

ssh-keygen -t ed25519 -a 100 -f $EMERG_KEY_NAME -C "nt114-bastion-devsecops@$EMERG_DATE-emergency" -N ""

# Immediate GitHub secret update
gh secret set BASTION_PUBLIC_KEY \
  --repo NT114DevSecOpsProject/NT114_DevSecOps_Project \
  --body "$(cat $EMERG_KEY_NAME.pub)"

# Trigger infrastructure redeployment
gh workflow run eks-terraform.yml --field environment=dev --field action=apply

echo "Emergency key rotation completed. Infrastructure redeployment triggered."
```

---

## Infrastructure Deployment

### 1. Repository Setup

#### Clone and Configure Repository
```bash
# Clone repository
git clone https://github.com/NT114DevSecOpsProject/NT114_DevSecOps_Project.git
cd NT114_DevSecOps_Project

# Configure Git
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

#### Set Up GitHub Secrets
```bash
# AWS credentials for GitHub Actions
gh secret set AWS_ACCESS_KEY_ID --body "YOUR_ACCESS_KEY_ID"
gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_SECRET_ACCESS_KEY"

# SSH key for bastion host (already configured)
gh secret set BASTION_PUBLIC_KEY --body "$(cat nt114-bastion-devsecops-251114.pub)"
```

### 2. Terraform Configuration

#### Environment Setup
```bash
cd terraform/environments/dev

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Review execution plan
terraform plan
```

#### Key Configuration Files

**variables.tf (Updated Values)**
```hcl
variable "enable_ebs_csi_controller" {
  description = "Enable EBS CSI Controller IAM role"
  type        = bool
  default     = true  # Updated for storage support
}

variable "enable_alb_controller" {
  description = "Enable ALB Controller IAM role"
  type        = bool
  default     = true  # Updated for load balancing
}
```

### 3. Deploy Infrastructure via GitHub Actions

#### Method 1: Automated Deployment (Recommended)
```bash
# Trigger infrastructure deployment
gh workflow run eks-terraform.yml \
  --field environment=dev \
  --field action=apply

# Monitor deployment
gh run watch --last
```

#### Method 2: Manual Local Deployment
```bash
cd terraform/environments/dev

# Apply infrastructure changes
terraform apply -auto-approve

# Get outputs for Kubernetes configuration
terraform output -json > ../outputs.json
```

### 4. Kubernetes Cluster Configuration

#### Configure kubectl
```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name $(terraform output -raw cluster_name)

# Verify cluster access
kubectl get nodes
kubectl get namespaces
```

#### Verify EBS CSI Driver
```bash
# Check EBS CSI driver status
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver

# Check storage class
kubectl get storageclass ebs-gp3-encrypted
```

#### Verify ALB Controller
```bash
# Check ALB controller deployment status
kubectl get deployment -n kube-system aws-load-balancer-controller

# Check ALB controller pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Verify service account and IAM role
kubectl describe sa aws-load-balancer-controller -n kube-system

# Check controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller --tail=50
```

### 5. EC2 Instance Metadata Configuration

#### Metadata Hop Limit for Pod Access
EKS node groups require `http_put_response_hop_limit=2` to allow pods to access EC2 instance metadata through container networking layer.

**Configuration in `terraform/modules/eks-nodegroup/main.tf`:**
```hcl
metadata_options = {
  http_endpoint               = "enabled"
  http_tokens                 = "required"  # IMDSv2 enforced
  http_put_response_hop_limit = 2           # Allow pod metadata access
  instance_metadata_tags      = "disabled"
}
```

**Network Path**: EC2 Instance → Container Runtime → Pod
- Default hop limit of 1 blocks pod-level metadata access
- Hop limit of 2 enables pods (like ALB controller) to retrieve IAM credentials
- IMDSv2 enforcement maintained for security

**Validation:**
```bash
# Check node metadata configuration
aws ec2 describe-instances \
  --filters "Name=tag:eks:cluster-name,Values=eks-1" \
  --query 'Reservations[*].Instances[*].[InstanceId,MetadataOptions.HttpPutResponseHopLimit,MetadataOptions.HttpTokens]' \
  --output table

# Expected output:
# InstanceId: i-xxxxx
# HttpPutResponseHopLimit: 2
# HttpTokens: required
```

---

## Application Deployment

### 1. GitHub Actions Application Deployment

#### Trigger Application Deployment
```bash
# Deploy applications to EKS
gh workflow run deploy-to-eks.yml \
  --field environment=dev

# Monitor deployment
gh run watch --last
```

#### Deployment Steps (Automated)
1. **Configure AWS Credentials**
2. **Install kubectl**
3. **Configure kubectl for EKS**
4. **Enable EBS CSI Driver Addon**
5. **Validate EBS CSI Driver**
6. **Create StorageClass**
7. **Deploy PostgreSQL**
8. **Deploy Application Services**
9. **Verify Deployment**

### 2. Manual Deployment (Optional)

#### Deploy PostgreSQL
```bash
# Apply PostgreSQL configuration
kubectl apply -f kubernetes/local/postgres-deployment.yaml -n dev

# Wait for StatefulSet to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n dev --timeout=600s

# Verify services
kubectl get services -n dev -l app=postgres
```

#### Deploy Application Services
```bash
# Deploy all services
kubectl apply -f kubernetes/services/ -n dev

# Wait for deployments
kubectl wait --for=condition=available deployment --all -n dev --timeout=600s

# Check pod status
kubectl get pods -n dev
```

### 3. Service Verification

#### Verify Service Connectivity
```bash
# Check service endpoints
kubectl get endpoints -n dev

# Test database connectivity
kubectl run postgres-test --image=postgres:15-alpine --rm -i --restart=Never -- \
  psql "postgresql://postgres:postgres@auth-db.dev.svc.cluster.local:5432/postgres" \
  -c "SELECT version();"

# Test API endpoints
kubectl port-forward service/api-gateway-service 8080:80 -n dev &
curl http://localhost:8080/health
```

---

## Database Migration

### 1. Preparation

#### Backup Current Data
```bash
#!/bin/bash
# backup-local-databases.sh

# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup each database
docker exec user_management_postgres_db pg_dump -U postgres user_management_db > backups/$(date +%Y%m%d)/auth_db_backup.sql
docker exec exercises_postgres pg_dump -U exercises_user exercises_db > backups/$(date +%Y%m%d)/exercises_db_backup.sql
docker exec scores_postgres pg_dump -U scores_user scores_db > backups/$(date +%Y%m%d)/scores_db_backup.sql

echo "Database backups completed in backups/$(date +%Y%m%d)/"
```

### 2. RDS Migration Execution

#### Deploy RDS Infrastructure
```bash
# Trigger RDS migration workflow
gh workflow run rds-migration.yml \
  --field environment=dev \
  --field action=migrate

# Monitor migration
gh run watch --last
```

#### Manual Migration (Optional)
```bash
# Deploy RDS via Terraform
cd terraform/environments/dev
terraform apply -target=module.rds_postgresql -auto-approve

# Get RDS endpoint
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
RDS_PASSWORD=$(aws secretsmanager get-secret-value --secret-id rds-password-dev --query SecretString --output text)

# Create SSH tunnel for migration
ssh -i nt114-bastion-devsecops-251114 \
  -f -N -L 5432:$RDS_ENDPOINT:5432 \
  ec2-user@$(terraform output -raw bastion_public_ip)

# Execute migration
./scripts/execute-migration.sh
```

### 3. Migration Validation

#### Data Integrity Checks
```bash
#!/bin/bash
# validate-migration.sh

# Row count validation
for db in auth_db exercises_db scores_db; do
    local_count=$(docker exec ${db}_postgres psql -U postgres -d $db -t -c "SELECT COUNT(*) FROM $(echo $db | sed 's/_db//' | sed 's/auth_db/users/');")
    rds_count=$(PGPASSWORD=$RDS_PASSWORD psql -h localhost -U postgres -d $db -t -c "SELECT COUNT(*) FROM $(echo $db | sed 's/_db//' | sed 's/auth_db/users/');")

    if [ "$local_count" = "$rds_count" ]; then
        echo "✅ $db: $local_count rows match"
    else
        echo "❌ $db: mismatch ($local_count vs $rds_count)"
        exit 1
    fi
done

echo "✅ All data integrity checks passed"
```

---

## Monitoring and Validation

### 1. Infrastructure Health Checks

#### Kubernetes Cluster Health
```bash
# Check cluster health
kubectl get nodes -o wide
kubectl get pods --all-namespaces
kubectl get services --all-namespaces

# Check resource usage
kubectl top nodes
kubectl top pods --all-namespaces
```

#### AWS Resource Health
```bash
# Check EKS cluster status
aws eks describe-cluster --name eks-1 --query 'cluster.status'

# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier nt114-dev-postgres

# Check EC2 instances
aws ec2 describe-instances --filters "Name=tag:Name,Values=*nt114*" --query 'Reservations[*].Instances[*].[InstanceId,State.Name,Tags[?Key==`Name`].Value]'
```

### 2. Application Health Checks

#### Service Endpoints
```bash
# Set up port forwarding
kubectl port-forward service/api-gateway-service 8080:80 -n dev &
API_PID=$!

kubectl port-forward service/frontend-service 3000:3000 -n dev &
FE_PID=$!

# Test endpoints
sleep 5
curl -f http://localhost:8080/health || echo "API Gateway health check failed"
curl -f http://localhost:3000 || echo "Frontend health check failed"

# Clean up
kill $API_PID $FE_PID 2>/dev/null
```

#### Database Connectivity
```bash
# Test database connections
kubectl run db-test --image=postgres:15-alpine --rm -i --restart=Never -- \
  bash -c "
for db in auth_db exercises_db scores_db; do
    PGPASSWORD=\$POSTGRES_PASSWORD psql -h \$DB_HOST -U postgres -d \$db -c 'SELECT 1;'
    echo \"✅ Connected to \$db\"
done
"
```

### 3. Performance Monitoring

#### CloudWatch Metrics
```bash
# Get recent CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EKS \
  --metric-name ClusterResourceUsage \
  --dimensions Name=ClusterName,Value=eks-1 \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

#### Application Performance
```bash
# Deploy monitoring stack (optional)
kubectl apply -f kubernetes/monitoring/ -n monitoring

# Check monitoring dashboards
kubectl get pods -n monitoring
kubectl get services -n monitoring
```

---

## Troubleshooting

### 1. Common Issues and Solutions

#### GitHub Actions Failures
```bash
# Check workflow logs
gh run list --limit 10
gh run view --log <run-id>

# Common fixes:
# 1. Check AWS credentials in GitHub secrets
# 2. Verify BASTION_PUBLIC_KEY is correctly set
# 3. Check Terraform backend configuration
# 4. Validate IAM permissions
```

#### EKS Cluster Issues
```bash
# Check cluster status
aws eks describe-cluster --name eks-1

# Get node diagnostics
kubectl describe nodes

# Check pod issues
kubectl describe pod <pod-name> -n dev
kubectl logs <pod-name> -n dev --tail=100
```

#### PostgreSQL Deployment Issues
```bash
# Check StatefulSet status
kubectl get statefulset postgres -n dev -o wide
kubectl describe statefulset postgres -n dev

# Check PVC status
kubectl get pvc -n dev
kubectl describe pvc <pvc-name> -n dev

# Check storage class
kubectl get storageclass
kubectl describe storageclass ebs-gp3-encrypted
```

#### ALB Controller Pod Failures
```bash
# Check ALB controller pod status and events
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
kubectl describe pod -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Common issue: Metadata access failure
# Error: "failed to introspect EC2 instance" or "unable to retrieve credentials"
# Solution: Verify metadata hop limit configuration

# Verify node metadata settings
aws ec2 describe-instances \
  --filters "Name=tag:eks:cluster-name,Values=eks-1" \
  --query 'Reservations[*].Instances[*].MetadataOptions' \
  --output json

# Check required values:
# - HttpPutResponseHopLimit: 2 (must be 2 for pod access)
# - HttpTokens: required (IMDSv2 enforced)

# If hop limit is incorrect, update node group terraform:
# metadata_options.http_put_response_hop_limit = 2
# Then: terraform apply

# Check IAM role attachment
kubectl describe sa aws-load-balancer-controller -n kube-system | grep "eks.amazonaws.com/role-arn"

# Verify VPC ID is passed correctly
kubectl get deployment aws-load-balancer-controller -n kube-system -o yaml | grep vpcId

# Check Helm release status
helm list -n kube-system | grep aws-load-balancer-controller
helm status aws-load-balancer-controller -n kube-system
```

#### Helm Deployment Issues
```bash
# Check Helm repository
helm repo list | grep eks-charts

# Update Helm repositories
helm repo update

# Verify Helm chart version availability
helm search repo eks/aws-load-balancer-controller --versions

# Check Helm release history
helm history aws-load-balancer-controller -n kube-system

# Rollback if needed
helm rollback aws-load-balancer-controller -n kube-system
```

#### SSH Connection Issues
```bash
# Test SSH to bastion host
ssh -i nt114-bastion-devsecops-251114 -v ec2-user@<bastion-ip>

# Check security groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=*bastion*"

# Verify key pair in AWS
aws ec2 describe-key-pairs --key-names nt114-bastion-devsecops-251114
```

### 2. Recovery Procedures

#### Infrastructure Rollback
```bash
cd terraform/environments/dev

# Destroy specific resources
terraform destroy -target=module.eks_cluster -auto-approve
terraform destroy -target=module.vpc -auto-approve

# Re-deploy
terraform apply -auto-approve
```

#### Application Recovery
```bash
# Scale down services
kubectl scale deployment --all --replicas=0 -n dev

# Reset PVCs (if needed)
kubectl delete pvc --all -n dev

# Re-deploy applications
kubectl apply -f kubernetes/ -n dev
```

#### Database Recovery
```bash
# Connect to bastion host
ssh -i nt114-bastion-devsecops-251114 ec2-user@<bastion-ip>

# Access PostgreSQL and restore from backup
psql -h $RDS_ENDPOINT -U postgres -d postgres -f backup.sql
```

---

## Maintenance and Updates

### 1. Regular Maintenance Tasks

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "Starting weekly maintenance..."

# Update Kubernetes packages
kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u

# Check for security updates
aws eks describe-cluster --name eks-1 --query 'cluster.version'
kubectl version --short

# Review CloudWatch metrics and alerts
aws cloudwatch describe-alarms --state-value ALARM

echo "Weekly maintenance completed"
```

#### Monthly Tasks
```bash
#!/bin/bash
# monthly-maintenance.sh

echo "Starting monthly maintenance..."

# Rotate SSH keys (quarterly, check if needed)
KEY_DATE=$(ssh-keygen -lf nt114-bastion-devsecops-*.pub | head -1 | awk '{print $2}')
echo "Current key date: $KEY_DATE"

# Update Terraform modules
cd terraform
terraform get -update

# Review IAM policies and access
aws iam list-policies --scope Local --max-items 100

echo "Monthly maintenance completed"
```

### 2. Update Procedures

#### Application Updates
```bash
# Update application images
# 1. Update image tags in deployment files
# 2. Commit changes
git add kubernetes/
git commit -m "feat: update application images to latest versions"
git push origin main

# 3. Trigger deployment
gh workflow run deploy-to-eks.yml --field environment=dev
```

#### Infrastructure Updates
```bash
# Update Terraform configuration
cd terraform/environments/dev

# Check for updates
terraform plan

# Apply updates
terraform apply -auto-approve
```

#### Kubernetes Version Updates
```bash
# Check available versions
aws eks describe-cluster --name eks-1 --query 'cluster.version'
aws eks list-addon-versions --kubernetes-version 1.28

# Update cluster (carefully planned)
aws eks update-cluster-version \
  --name eks-1 \
  --kubernetes-version 1.29 \
  --no-cli-paginate
```

---

## Security Best Practices

### 1. Access Control

#### SSH Key Management
- **Store private keys** in encrypted password managers
- **Rotate keys quarterly** or immediately upon compromise
- **Limit key access** to authorized team members only
- **Audit key usage** through AWS CloudTrail

#### IAM Security
- **Use least privilege** access for all IAM roles
- **Rotate access keys** every 90 days
- **Enable MFA** for all IAM users
- **Regular access reviews** for permissions

### 2. Network Security

#### Security Group Rules
```bash
# Review current security groups
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=<vpc-id>"

# Example bastion security group (should be restrictive)
aws ec2 authorize-security-group-ingress \
  --group-id <bastion-sg-id> \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/24  # Your corporate IP range
```

#### VPC Monitoring
```bash
# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids <vpc-id> \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name VPCFlowLogs
```

### 3. Application Security

#### Container Security
```bash
# Scan images for vulnerabilities
trivy image nt114/user-management:latest
trivy image nt114/exercises-service:latest
trivy image nt114/scores-service:latest

# Update base images regularly
# Use non-root users in containers
# Implement runtime security monitoring
```

---

## Cost Optimization

### 1. Resource Rightsizing

#### Monitoring Resource Usage
```bash
# Check EKS node utilization
kubectl top nodes
kubectl describe nodes

# Review RDS performance
aws rds describe-db-log-files \
  --db-instance-identifier nt114-dev-postgres \
  --filename-prefix error/postgresql.log.
```

#### Optimization Recommendations
- **EKS**: Use right-sized node instances based on actual usage
- **RDS**: Consider serverless or smaller instances for dev environments
- **Storage**: Use gp3 volumes with appropriate IOPS and throughput
- **Load Balancer**: Ensure proper load balancer type and configuration

### 2. Cost Monitoring

#### Set Up Billing Alerts
```bash
# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "AWS-Billing-Alarm" \
  --alarm-description "Alarm when AWS billing exceeds $100" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying and maintaining the NT114 DevSecOps infrastructure. The deployment process emphasizes:

- **Automation**: Use of GitHub Actions for CI/CD
- **Security**: SSH key management and least-privilege access
- **Reliability**: Proper error handling and recovery procedures
- **Scalability**: Auto-scaling and performance optimization
- **Maintainability**: Clear documentation and monitoring

**Key Success Factors:**
1. Proper SSH key configuration and GitHub secret management
2. Complete AWS IAM permissions for GitHub Actions
3. Regular monitoring and maintenance procedures
4. Comprehensive backup and disaster recovery plans
5. Security best practices throughout the deployment

The infrastructure is production-ready with proper observability, security controls, and operational procedures in place.

---

**Document Version**: 2.1
**Last Updated**: November 20, 2025
**Next Review**: December 20, 2025
**Deployment Status**: ✅ Production Ready
**Recent Updates**: ALB controller metadata hop limit fix, troubleshooting enhancements

## Support and Contact

For deployment issues or questions:
- **Documentation**: Refer to project docs folder
- **GitHub Issues**: Create issues for specific problems
- **Team Contacts**: Refer to project team communication channels
- **Emergency**: Follow incident response procedures in security documentation

---

**Classification**: Internal - Confidential
**Distribution**: DevOps Team, System Administrators