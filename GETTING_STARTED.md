# Getting Started - NT114 DevSecOps Project

Welcome! This guide will help you deploy the complete NT114 DevSecOps application to AWS EKS.

## 🎯 Choose Your Path

### 👶 New to Cloud Deployment?
**Start here:** [QUICKSTART.md](QUICKSTART.md)
- Step-by-step instructions with expected outputs
- Every command explained
- Screenshots and checkpoints
- Estimated time: 45 minutes

### 🎨 Visual Learner?
**Check out:** [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md)
- Flowcharts and diagrams
- Visual infrastructure overview
- Network traffic flow
- GitOps workflow visualization

### 💪 Experienced DevOps Engineer?
**Quick reference:** [DEPLOYMENT.md](DEPLOYMENT.md)
- Complete technical documentation
- Advanced configurations
- Troubleshooting guide
- CI/CD integration

## 📋 Prerequisites

Before you begin, you need:

- [ ] **AWS Account** with admin access
- [ ] **AWS CLI** installed and configured
- [ ] **Terraform** >= 1.5.0
- [ ] **kubectl**
- [ ] **Helm** >= 3.x
- [ ] **Docker**
- [ ] **Git**

**Verify installations:**
```bash
aws --version
terraform --version
kubectl version --client
helm version
docker --version
git --version
```

## 🚀 Quick Start Commands

If you just want to get started quickly:

```bash
# Configure deployment
./scripts/configure-deployment.sh

# Create ECR repositories
./scripts/create-ecr-repos.sh

# Build and push images
./scripts/build-and-push.sh

# Deploy infrastructure
cd terraform/environments/dev
terraform init && terraform apply

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name eks-1

# Install ArgoCD
cd ../../argocd && ./install-argocd.sh

# Deploy applications
./deploy-all.sh
```

**Total time:** ~35-50 minutes

## 📚 Documentation Index

### Core Documentation
| Document | Purpose | Audience |
|----------|---------|----------|
| [QUICKSTART.md](QUICKSTART.md) | Step-by-step deployment guide | Beginners |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Complete deployment docs | All levels |
| [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md) | Visual flow diagrams | Visual learners |

### Technical Documentation
| Document | Purpose |
|----------|---------|
| [terraform/README.md](terraform/README.md) | Infrastructure as Code guide |
| [helm/README.md](helm/README.md) | Kubernetes deployment charts |
| [argocd/README.md](argocd/README.md) | GitOps continuous deployment |
| [scripts/README.md](scripts/README.md) | Automation scripts reference |

## 🏗️ What You'll Deploy

### Infrastructure (Terraform)
- **VPC** with public/private subnets across 3 AZs
- **EKS Cluster** running Kubernetes 1.31
- **Managed Node Group** with 2 t3.large SPOT instances
- **Application Load Balancers** for frontend and API
- **IAM Roles** and security configurations

### Applications (Helm + ArgoCD)
- **Frontend** - React application (2-10 replicas)
- **API Gateway** - Node.js gateway (2-10 replicas)
- **User Management Service** - Node.js microservice (2-5 replicas)
- **Exercises Service** - Node.js microservice (2-5 replicas)
- **Scores Service** - Node.js microservice (2-5 replicas)

### Platform Services
- **ArgoCD** - GitOps continuous deployment
- **AWS Load Balancer Controller** - Ingress management
- **Horizontal Pod Autoscaler** - Auto-scaling
- **CoreDNS** - Service discovery

## 🎯 Architecture Overview

```
Internet
    │
    ▼
Application Load Balancer (Public)
    │
    ├─► Frontend (React)
    └─► API Gateway
          │
          ├─► User Management Service
          ├─► Exercises Service
          └─► Scores Service
```

All services run in private subnets on EKS cluster.

## ⏱️ Time Breakdown

| Phase | Duration |
|-------|----------|
| Configuration & Setup | 2 minutes |
| Build Docker Images | 10-15 minutes |
| Deploy Infrastructure | 15-20 minutes |
| Install ArgoCD | 3-5 minutes |
| Deploy Applications | 2-3 minutes |
| **Total** | **35-50 minutes** |

## 💰 Cost Estimate

Monthly AWS costs with SPOT instances:
- EKS Cluster: $73/month
- EC2 Instances: ~$25/month
- NAT Gateway: $32/month
- Load Balancers: ~$22/month
- Data Transfer: ~$10/month

**Total: ~$162/month**

## 🔐 Security Features

- ✅ Private subnets for applications
- ✅ IRSA (IAM Roles for Service Accounts)
- ✅ Non-root containers
- ✅ Security contexts configured
- ✅ Network isolation
- ✅ Image scanning enabled in ECR

## 📊 Key Features

### Production Ready
- Auto-scaling with HPA
- Load balancing with ALB
- Health checks and monitoring
- Self-healing deployments
- Zero-downtime updates

### GitOps Workflow
- Git as single source of truth
- Automated deployments from GitHub
- Easy rollbacks
- Audit trail
- Web UI for monitoring

### Developer Friendly
- One-command setup scripts
- Comprehensive documentation
- Visual diagrams
- Troubleshooting guides
- Local development support

## 🛠️ Automation Scripts

The project includes helper scripts to simplify deployment:

### configure-deployment.sh
Automatically configures AWS Account ID and region in all configuration files.

```bash
./scripts/configure-deployment.sh
```

### create-ecr-repos.sh
Creates ECR repositories for all microservices with image scanning enabled.

```bash
./scripts/create-ecr-repos.sh
```

### build-and-push.sh
Builds all Docker images and pushes them to ECR.

```bash
./scripts/build-and-push.sh
```

## 📖 Learning Path

### Day 1: Deployment
1. Read [QUICKSTART.md](QUICKSTART.md)
2. Deploy infrastructure
3. Deploy applications
4. Verify everything works

### Day 2: Understanding
1. Review [terraform/README.md](terraform/README.md)
2. Explore Helm charts in [helm/README.md](helm/README.md)
3. Learn ArgoCD in [argocd/README.md](argocd/README.md)

### Day 3: Customization
1. Modify application code
2. Build new images
3. Deploy via GitOps
4. Observe ArgoCD sync

### Day 4: Advanced
1. Set up monitoring
2. Configure custom domains
3. Add HTTPS/SSL
4. Implement CI/CD pipelines

## 🔧 Common Tasks

### View Application Logs
```bash
kubectl logs -l app.kubernetes.io/name=frontend
```

### Get Application URLs
```bash
kubectl get ingress
```

### Scale Applications
```bash
kubectl scale deployment frontend --replicas=5
```

### Update Image Version
```bash
# Update helm/frontend/values.yaml
image:
  tag: v2.0.0

# Commit and push
git add . && git commit -m "Update version" && git push

# ArgoCD auto-deploys
```

### Access ArgoCD UI
```bash
kubectl get svc argocd-server -n argocd
```

## 🐛 Troubleshooting

### Pods Not Starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Can't Access Application
```bash
kubectl get ingress
kubectl describe ingress <ingress-name>
```

### ArgoCD Sync Issues
```bash
kubectl get applications -n argocd
argocd app sync <app-name>
```

See [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting) for detailed troubleshooting.

## 🎓 Additional Resources

### Official Documentation
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)

### GitHub Repository
- [NT114_DevSecOps_Project](https://github.com/conghieu2004/NT114_DevSecOps_Project)

## ❓ FAQ

**Q: How much does this cost to run?**
A: Approximately $162/month with SPOT instances. See cost breakdown above.

**Q: Can I use ON_DEMAND instances instead of SPOT?**
A: Yes, change `node_capacity_type = "ON_DEMAND"` in Terraform variables.

**Q: How do I update my application?**
A: Build new image, push to ECR, update image tag in Git, ArgoCD auto-deploys.

**Q: Can I deploy to multiple environments?**
A: Yes, create new directories in `terraform/environments/` and `helm/values-<env>.yaml`.

**Q: What if I encounter errors?**
A: Check [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting) or open a GitHub issue.

## 📞 Getting Help

1. **Check Documentation**: Most answers are in the docs
2. **Review Logs**: `kubectl logs <pod-name>`
3. **Check Events**: `kubectl get events`
4. **GitHub Issues**: Open an issue in the repository
5. **AWS Support**: For AWS-specific issues

## ✅ Next Steps

1. **Read** [QUICKSTART.md](QUICKSTART.md) for step-by-step instructions
2. **Run** `./scripts/configure-deployment.sh` to configure AWS settings
3. **Follow** the deployment steps
4. **Celebrate** 🎉 when your app is running!

---

**Ready to deploy?** Start with [QUICKSTART.md](QUICKSTART.md)!

**Need visuals?** Check [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md)!

**Want details?** Read [DEPLOYMENT.md](DEPLOYMENT.md)!
