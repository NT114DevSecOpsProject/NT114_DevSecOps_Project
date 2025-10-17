# Deployment Scripts

Helper scripts for deploying the NT114 DevSecOps project.

## Scripts Overview

### 1. configure-deployment.sh

Automatically configures deployment settings including AWS Account ID and region.

```bash
./scripts/configure-deployment.sh
```

**What it does:**
- Detects AWS Account ID from configured AWS CLI
- Prompts for AWS region (default: us-east-1)
- Updates all Helm values.yaml files with correct ECR repository URLs
- Updates all ArgoCD application manifests
- Configures Terraform variables

**When to use:** Run this first before deployment to set up all configuration files.

### 2. create-ecr-repos.sh

Creates ECR repositories for all microservices.

```bash
./scripts/create-ecr-repos.sh
```

**What it does:**
- Creates ECR repository for each service:
  - frontend
  - api-gateway
  - user-management-service
  - exercises-service
  - scores-service
- Enables image scanning on push
- Sets up lifecycle policy (keep last 10 images)
- Configures AES256 encryption

**Prerequisites:**
- AWS CLI installed and configured
- ECR permissions (ecr:CreateRepository, ecr:PutLifecyclePolicy)

### 3. build-and-push.sh

Builds Docker images and pushes them to ECR.

```bash
./scripts/build-and-push.sh
```

**What it does:**
- Logs into AWS ECR
- Builds Docker images for all services
- Tags images with ECR repository URLs
- Pushes images to ECR

**Prerequisites:**
- Docker installed
- ECR repositories created
- Source code and Dockerfiles present

**Environment Variables:**
- `IMAGE_TAG`: Image tag to use (default: latest)
- `AWS_REGION`: AWS region (default: us-east-1)

## Usage Flow

### Complete Deployment Workflow

```bash
# 1. Configure deployment settings
./scripts/configure-deployment.sh

# 2. Create ECR repositories
./scripts/create-ecr-repos.sh

# 3. Build and push Docker images
./scripts/build-and-push.sh

# 4. Deploy infrastructure
cd terraform/environments/dev
terraform init
terraform apply

# 5. Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name eks-1

# 6. Install ArgoCD
cd ../../argocd
./install-argocd.sh

# 7. Deploy applications
./deploy-all.sh
```

### Custom Image Tag

Build with specific version:

```bash
IMAGE_TAG=v1.0.0 ./scripts/build-and-push.sh
```

### Different AWS Region

```bash
AWS_REGION=ap-southeast-1 ./scripts/create-ecr-repos.sh
```

## Script Details

### configure-deployment.sh

**Interactive Prompts:**
1. Confirm detected AWS Account ID or enter manually
2. Enter AWS region (or use default)
3. Confirm configuration update

**Files Updated:**
- `helm/*/values.yaml` - All 5 services
- `argocd/applications/*.yaml` - All 5 applications
- `terraform/environments/dev/terraform.tfvars` - Terraform variables

**Validation:**
- Ensures AWS Account ID is 12 digits
- Checks for file existence before updating

### create-ecr-repos.sh

**Features:**
- Checks if repository already exists (idempotent)
- Enables image scanning for security
- Sets lifecycle policy to clean old images
- Encrypts images at rest

**Output:**
- Lists all created repository URLs
- Shows next steps for login and pushing images

### build-and-push.sh

**Build Order:**
1. Frontend (React app)
2. API Gateway
3. User Management Service
4. Exercises Service
5. Scores Service

**Image Naming:**
- Format: `{AWS_ACCOUNT_ID}.dkr.ecr.{AWS_REGION}.amazonaws.com/{SERVICE}:{TAG}`
- Example: `123456789012.dkr.ecr.us-east-1.amazonaws.com/frontend:latest`

**Error Handling:**
- Checks for Dockerfile existence
- Verifies AWS CLI installation
- Validates ECR login

## Troubleshooting

### AWS Credentials Error

```bash
# Configure AWS credentials
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_DEFAULT_REGION=us-east-1
```

### ECR Login Failed

```bash
# Manual login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  {AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
```

### Docker Build Failed

Check:
1. Dockerfile exists in service directory
2. Docker daemon is running
3. Sufficient disk space
4. Build context is correct

### Permission Denied

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

## Advanced Usage

### Parallel Builds

Build services in parallel:

```bash
# Build all services concurrently
for service in frontend api-gateway user-management-service exercises-service scores-service; do
  (cd $service && docker build -t $service:latest .) &
done
wait
```

### Custom Build Args

Modify build-and-push.sh to add build arguments:

```bash
docker build --build-arg NODE_ENV=production -t frontend:latest ./frontend
```

### Multi-Architecture Builds

For ARM support:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t {ECR_URL}/frontend:latest \
  --push ./frontend
```

## Integration with CI/CD

### GitHub Actions

Use scripts in GitHub Actions:

```yaml
- name: Configure Deployment
  run: ./scripts/configure-deployment.sh
  env:
    AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}

- name: Build and Push
  run: ./scripts/build-and-push.sh
  env:
    IMAGE_TAG: ${{ github.sha }}
```

### GitLab CI

```yaml
build:
  script:
    - ./scripts/build-and-push.sh
  variables:
    IMAGE_TAG: $CI_COMMIT_SHA
```

## Best Practices

1. **Version Tags**: Use semantic versioning instead of `latest`
2. **Cache Layers**: Leverage Docker layer caching for faster builds
3. **Security Scanning**: Scan images before pushing
4. **Multi-stage Builds**: Use multi-stage Dockerfiles to reduce image size
5. **Resource Cleanup**: Regularly clean up old images from ECR

## See Also

- [Main Deployment Guide](../DEPLOYMENT.md)
- [Helm Charts Documentation](../helm/README.md)
- [ArgoCD Documentation](../argocd/README.md)
