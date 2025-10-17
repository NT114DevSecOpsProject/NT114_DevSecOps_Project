# Deployment Flow Diagram

Visual guide showing the complete deployment process.

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    START DEPLOYMENT                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Verify Prerequisites                               │
│  ✓ AWS CLI, Terraform, kubectl, Helm, Docker               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Configure Deployment                               │
│  ./scripts/configure-deployment.sh                          │
│  → Sets AWS Account ID and Region                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Create ECR Repositories                            │
│  ./scripts/create-ecr-repos.sh                              │
│  → Creates 5 ECR repos for microservices                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Build & Push Docker Images                         │
│  ./scripts/build-and-push.sh                                │
│  → Builds and pushes all containers to ECR                  │
│  ⏱️  Takes ~10-15 minutes                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Deploy AWS Infrastructure                          │
│  cd terraform/environments/dev                              │
│  terraform init && terraform apply                          │
│  → Creates VPC, EKS Cluster, Node Groups                    │
│  ⏱️  Takes ~15-20 minutes                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Configure kubectl                                  │
│  aws eks update-kubeconfig --region us-east-1 --name eks-1  │
│  → Connects kubectl to EKS cluster                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 7: Install ArgoCD                                     │
│  cd argocd && ./install-argocd.sh                           │
│  → Installs GitOps CD tool                                  │
│  → Provides admin password and URL                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 8: Deploy Applications                                │
│  ./deploy-all.sh                                            │
│  → Deploys 5 applications via ArgoCD                        │
│  → ArgoCD syncs from GitHub                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 9: Monitor Deployment                                 │
│  kubectl get pods -w                                        │
│  → Wait for all pods to be Running                          │
│  ⏱️  Takes ~2-3 minutes                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 10: Get Application URLs                              │
│  kubectl get ingress                                        │
│  → Get ALB URLs for frontend and API                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 11: Test Application                                  │
│  curl http://<frontend-url>                                 │
│  → Verify application is accessible                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              🎉 DEPLOYMENT COMPLETE 🎉                       │
│                                                             │
│  ✅ EKS Cluster Running                                      │
│  ✅ All Microservices Deployed                               │
│  ✅ Frontend Accessible                                      │
│  ✅ API Gateway Working                                      │
│  ✅ ArgoCD Managing Deployments                              │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Infrastructure Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Terraform Apply                          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├──► Creates VPC (11.0.0.0/16)
             │    ├─► 3 Public Subnets (11.0.101-103.0/24)
             │    ├─► 3 Private Subnets (11.0.1-3.0/24)
             │    ├─► Internet Gateway
             │    ├─► NAT Gateway
             │    └─► Route Tables
             │
             ├──► Creates EKS Cluster
             │    ├─► Control Plane (Kubernetes 1.31)
             │    ├─► OIDC Provider (for IRSA)
             │    ├─► Cluster Addons
             │    │   ├─► vpc-cni
             │    │   ├─► kube-proxy
             │    │   └─► pod-identity-agent
             │    └─► Security Groups
             │
             ├──► Creates Node Group
             │    ├─► 2x t3.large SPOT instances
             │    ├─► Auto-scaling (1-2 nodes)
             │    └─► IAM Instance Profile
             │
             ├──► Installs ALB Controller
             │    ├─► Helm Chart
             │    ├─► Service Account with IRSA
             │    └─► ALB Ingress Controller Pods
             │
             └──► Creates IAM Resources
                  ├─► Admin Role
                  ├─► Admin Group
                  └─► EKS Access Policies

┌──────────────────────────────────────────────────────────────┐
│              Infrastructure Ready for Apps                   │
└──────────────────────────────────────────────────────────────┘
```

## Application Deployment Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   ArgoCD Deployment                          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├──► Creates ArgoCD Project
             │    └─► nt114-devsecops
             │
             ├──► Deploys Frontend Application
             │    ├─► Reads helm/frontend from GitHub
             │    ├─► Creates Deployment (2 replicas)
             │    ├─► Creates Service (ClusterIP on port 80)
             │    ├─► Creates Ingress (ALB)
             │    └─► Creates HPA (2-10 replicas)
             │
             ├──► Deploys API Gateway
             │    ├─► Reads helm/api-gateway from GitHub
             │    ├─► Creates Deployment (2 replicas)
             │    ├─► Creates Service (ClusterIP on port 8080)
             │    ├─► Creates Ingress (ALB)
             │    └─► Creates HPA (2-10 replicas)
             │
             ├──► Deploys User Management Service
             │    ├─► Reads helm/user-management-service
             │    ├─► Creates Deployment (2 replicas)
             │    ├─► Creates Service (ClusterIP on port 8081)
             │    └─► Creates HPA (2-5 replicas)
             │
             ├──► Deploys Exercises Service
             │    ├─► Reads helm/exercises-service
             │    ├─► Creates Deployment (2 replicas)
             │    ├─► Creates Service (ClusterIP on port 8082)
             │    └─► Creates HPA (2-5 replicas)
             │
             └──► Deploys Scores Service
                  ├─► Reads helm/scores-service
                  ├─► Creates Deployment (2 replicas)
                  ├─► Creates Service (ClusterIP on port 8083)
                  └─► Creates HPA (2-5 replicas)

┌──────────────────────────────────────────────────────────────┐
│         ALB Controller Creates Load Balancers               │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├──► Frontend ALB
             │    ├─► Target Group → Frontend Pods
             │    └─► Public DNS: k8s-default-frontend-xxx.elb...
             │
             └──► API Gateway ALB
                  ├─► Target Group → API Gateway Pods
                  └─► Public DNS: k8s-default-apigatewy-xxx.elb...

┌──────────────────────────────────────────────────────────────┐
│              All Services Running & Accessible               │
└──────────────────────────────────────────────────────────────┘
```

## Network Traffic Flow

```
┌──────────────────────────────────────────────────────────────┐
│                          User                                │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ HTTP Request
             ▼
┌──────────────────────────────────────────────────────────────┐
│              Internet Gateway (IGW)                          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│         Application Load Balancer (Public Subnet)            │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │  Frontend ALB      │  │  API Gateway ALB   │             │
│  └────────┬───────────┘  └────────┬───────────┘             │
└───────────┼──────────────────────┼─────────────────────────┘
            │                      │
            │ Forward to Pods      │
            ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│              EKS Cluster (Private Subnet)                    │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │  Frontend Pods   │    │  API Gateway     │               │
│  │  (Port 80)       │    │  Pods            │               │
│  └──────────────────┘    │  (Port 8080)     │               │
│                          └────────┬──────────┘               │
│                                   │                          │
│                                   │ Internal calls           │
│                          ┌────────▼──────────┐               │
│                          │  User Mgmt Service│               │
│                          │  (Port 8081)      │               │
│                          └───────────────────┘               │
│                          ┌───────────────────┐               │
│                          │  Exercises Service│               │
│                          │  (Port 8082)      │               │
│                          └───────────────────┘               │
│                          ┌───────────────────┐               │
│                          │  Scores Service   │               │
│                          │  (Port 8083)      │               │
│                          └───────────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

## GitOps Continuous Deployment Flow

```
┌──────────────────────────────────────────────────────────────┐
│              Developer Workflow                              │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ 1. Code changes
             ▼
┌──────────────────────────────────────────────────────────────┐
│                   GitHub Repository                          │
│        github.com/conghieu2004/NT114_DevSecOps_Project       │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ 2. Build Docker image
             ▼
┌──────────────────────────────────────────────────────────────┐
│              AWS ECR (Container Registry)                    │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ 3. Update image tag in Git
             ▼
┌──────────────────────────────────────────────────────────────┐
│         GitHub (helm/*/values.yaml updated)                  │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ 4. ArgoCD detects change
             ▼
┌──────────────────────────────────────────────────────────────┐
│                      ArgoCD                                  │
│  ┌────────────────────────────────────────────┐             │
│  │  1. Polls GitHub every 3 minutes           │             │
│  │  2. Detects manifest changes               │             │
│  │  3. Generates Kubernetes resources         │             │
│  │  4. Applies to cluster                     │             │
│  │  5. Monitors health status                 │             │
│  └────────────────────────────────────────────┘             │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ 5. Rolling update
             ▼
┌──────────────────────────────────────────────────────────────┐
│              EKS Cluster (Kubernetes)                        │
│  ┌────────────────────────────────────────────┐             │
│  │  Old Pods → Terminating                    │             │
│  │  New Pods → ContainerCreating → Running    │             │
│  └────────────────────────────────────────────┘             │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│              Application Updated Successfully                │
└──────────────────────────────────────────────────────────────┘
```

## Time Estimates

| Step | Duration | Can Run Parallel |
|------|----------|------------------|
| Prerequisites Check | 2 minutes | No |
| Configure Deployment | 1 minute | No |
| Create ECR Repos | 1 minute | No |
| Build & Push Images | 10-15 minutes | Yes (per service) |
| Terraform Apply | 15-20 minutes | No |
| Configure kubectl | 30 seconds | No |
| Install ArgoCD | 3-5 minutes | No |
| Deploy Applications | 1 minute | Yes (ArgoCD) |
| Wait for Pods Ready | 2-3 minutes | Yes |
| Get URLs & Test | 1 minute | No |

**Total Time**: ~35-50 minutes

## Optimization Tips

1. **Parallel Image Builds**: Build all images simultaneously to save time
2. **Terraform Plan First**: Review plan before apply to catch issues early
3. **Use Cached Layers**: Docker layer caching speeds up builds
4. **Pre-pull Images**: Images are cached on nodes after first deployment

## Rollback Flow

If something goes wrong:

```
┌──────────────────────────────────────────────────────────────┐
│                     Issue Detected                           │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│              Option 1: ArgoCD Rollback                       │
│  argocd app rollback <app-name> <revision>                  │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│              Option 2: Git Revert                            │
│  git revert <commit> && git push                             │
│  ArgoCD auto-syncs to previous version                      │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│              Option 3: Helm Rollback                         │
│  helm rollback <release> <revision>                          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│              Application Restored                            │
└──────────────────────────────────────────────────────────────┘
```

## See Also

- [QUICKSTART.md](QUICKSTART.md) - Detailed step-by-step guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment documentation
- [Architecture Diagram](docs/architecture.md) - System architecture
