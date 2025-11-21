# EKS Infrastructure as Code - Modular Terraform

This directory contains modular Terraform configurations for deploying a complete AWS EKS (Elastic Kubernetes Service) infrastructure with best practices for the NT114 DevSecOps project.

## Architecture Overview

The infrastructure is organized into reusable modules that can be composed together:

```
terraform/
├── modules/                    # Reusable Terraform modules
│   ├── vpc/                   # VPC with public/private subnets
│   ├── eks-cluster/           # EKS control plane
│   ├── eks-nodegroup/         # Managed node groups with CoreDNS
│   ├── alb-controller/        # AWS Load Balancer Controller
│   └── iam-access/            # IAM roles and access control
└── environments/              # Environment-specific configurations
    └── dev/                   # Development environment
        ├── main.tf           # Module composition
        ├── variables.tf      # Input variables
        ├── outputs.tf        # Output values
        ├── providers.tf      # Provider configuration
        └── terraform.tfvars.example
```

## Module Structure

### 1. VPC Module (`modules/vpc`)
Creates a complete VPC infrastructure with:
- Public and private subnets across multiple AZs
- NAT Gateways for private subnet internet access
- Proper subnet tagging for EKS load balancer discovery
- DNS support enabled

**Key Features:**
- Configurable CIDR blocks
- Single or multi-AZ NAT Gateway options
- Automatic EKS cluster tagging

### 2. EKS Cluster Module (`modules/eks-cluster`)
Deploys the EKS control plane with:
- Configurable Kubernetes version
- IRSA (IAM Roles for Service Accounts) enabled
- Cluster addons (vpc-cni, kube-proxy, pod-identity-agent)
- Public/private endpoint configuration
- OIDC provider for authentication

**Key Features:**
- Managed cluster lifecycle
- Built-in security best practices
- Automatic OIDC provider setup

### 3. EKS Node Group Module (`modules/eks-nodegroup`)
Manages worker nodes with:
- Auto-scaling configuration
- SPOT or ON_DEMAND capacity types
- Configurable instance types
- CoreDNS addon management
- Custom labels and taints

**Key Features:**
- Managed node lifecycle
- Automatic cluster version matching
- CoreDNS integration

### 4. ALB Controller Module (`modules/alb-controller`)
Deploys AWS Load Balancer Controller via Helm:
- Automatic ingress to ALB mapping
- Integration with EKS IRSA
- Service account creation
- Configurable Helm values

**Key Features:**
- Automatic ALB provisioning for ingresses
- Cost-effective load balancing
- Native AWS integration

### 5. IAM Access Module (`modules/iam-access`)
Manages cluster access control:
- Admin IAM group and role
- AssumeRole policies
- EKS access entries
- Cluster access policies

**Key Features:**
- Centralized access management
- Role-based access control
- AWS IAM integration

## Deployment Guide

### Prerequisites

1. **Required Tools:**
   - Terraform >= 1.5.0
   - AWS CLI configured
   - kubectl (for cluster interaction)
   - Helm >= 2.11.0

2. **AWS Credentials:**
   - Set up AWS credentials with appropriate permissions
   - Required IAM permissions: VPC, EKS, EC2, IAM, S3

3. **GitHub Secrets (for CI/CD):**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### Local Deployment

#### Step 1: Navigate to Environment

```bash
cd terraform/environments/dev
```

#### Step 2: Configure Variables

Copy and customize the example variables:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific values:

```hcl
aws_region      = "us-east-1"
cluster_name    = "my-eks-cluster"
cluster_version = "1.33"
node_capacity_type = "SPOT"  # or "ON_DEMAND"
```

#### Step 3: Initialize Terraform

```bash
terraform init
```

This will:
- Download required provider plugins
- Initialize the backend
- Download module dependencies

#### Step 4: Plan Changes

```bash
terraform plan
```

Review the plan to ensure all resources are correct.

#### Step 5: Apply Configuration

```bash
terraform apply
```

Type `yes` when prompted to create the infrastructure.

#### Step 6: Configure kubectl

After deployment, configure kubectl to access your cluster:

```bash
aws eks update-kubeconfig --region us-east-1 --name eks-1
```

Or use the output command:

```bash
terraform output -raw configure_kubectl | bash
```

#### Step 7: Verify Deployment

```bash
kubectl get nodes
kubectl get pods -A
```

### GitHub Actions Deployment

The infrastructure is automatically deployed via GitHub Actions when changes are pushed to the `main` branch.

#### Workflow Features

- **Automatic Plan:** Comments on PRs with Terraform plan output
- **Environment Selection:** Deploy to dev, staging, or prod
- **Apply/Destroy Actions:** Manual workflow dispatch for infrastructure changes
- **Plan Artifacts:** Stores Terraform outputs for reference

#### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **EKS Terraform Deployment** workflow
3. Click **Run workflow**
4. Choose:
   - **Environment:** dev (default)
   - **Action:** apply or destroy

#### Workflow Triggers

- **Push to main:** Automatically applies changes
- **Pull Request:** Shows plan in PR comments
- **Manual:** Workflow dispatch for on-demand deployments

## Configuration Reference

### Common Variables

| Variable | Description | Default | Module |
|----------|-------------|---------|--------|
| `aws_region` | AWS region | `us-east-1` | All |
| `cluster_name` | EKS cluster name | `eks-1` | All |
| `cluster_version` | Kubernetes version | `1.33` | EKS |
| `vpc_cidr` | VPC CIDR block | `11.0.0.0/16` | VPC |
| `node_instance_types` | Instance types | `["t3.large"]` | Node Group |
| `node_capacity_type` | SPOT or ON_DEMAND | `SPOT` | Node Group |
| `enable_alb_controller` | Enable ALB controller | `true` | ALB |

### Module Outputs

The root module exposes outputs from all child modules:

```bash
# View all outputs
terraform output

# Get specific output
terraform output cluster_endpoint
terraform output vpc_id
terraform output admin_role_arn
```

## Cost Optimization

### SPOT Instances

The default configuration uses SPOT instances to reduce costs by up to 90%. To use ON_DEMAND instances:

```hcl
node_capacity_type = "ON_DEMAND"
```

### NAT Gateway

A single NAT Gateway is used by default. For production, consider multiple NAT Gateways:

```hcl
single_nat_gateway     = false
one_nat_gateway_per_az = true
```

### Right-Sizing

Adjust instance types and node counts based on workload:

```hcl
node_instance_types = ["t3.medium"]  # Smaller instances
node_min_size       = 1
node_max_size       = 5
node_desired_size   = 2
```

## Security Considerations

1. **Network Isolation:**
   - Worker nodes in private subnets
   - Control plane endpoint access configurable
   - Security groups managed by EKS

2. **IAM Best Practices:**
   - IRSA for pod-level permissions
   - Separate admin roles for cluster access
   - Least privilege principles

3. **Encryption:**
   - EKS secrets encrypted at rest
   - TLS for all communications
   - Optional EBS volume encryption

4. **Access Control:**
   - IAM-based cluster access
   - Kubernetes RBAC integration
   - Audit logging enabled

## Troubleshooting

### Common Issues

#### Module Not Found

```bash
Error: Module not installed
```

**Solution:** Run `terraform init` to download modules

#### Provider Version Conflicts

```bash
Error: Incompatible provider version
```

**Solution:** Update provider versions in `providers.tf`

#### Node Group Not Ready

**Symptoms:** Nodes not joining the cluster

**Solutions:**
1. Check subnet tags for EKS discovery
2. Verify IAM role permissions
3. Review security group rules
4. Check node group logs in AWS Console

#### ALB Controller Issues

**Symptoms:** Ingress not creating ALBs

**Solutions:**
1. Verify IRSA is enabled
2. Check service account annotations
3. Review controller logs:
   ```bash
   kubectl logs -n kube-system deployment/aws-load-balancer-controller
   ```

### Debug Commands

```bash
# Check cluster status
aws eks describe-cluster --name eks-1 --region us-east-1

# View node group status
aws eks describe-nodegroup --cluster-name eks-1 --nodegroup-name eks-node --region us-east-1

# Get kubectl context
kubectl config current-context

# View all resources
kubectl get all -A
```

## Updating Infrastructure

### Updating Kubernetes Version

1. Update `cluster_version` in `terraform.tfvars`
2. Plan and apply changes:
   ```bash
   terraform plan
   terraform apply
   ```

### Adding New Environments

1. Create new environment directory:
   ```bash
   mkdir -p environments/staging
   ```

2. Copy dev configuration:
   ```bash
   cp -r environments/dev/* environments/staging/
   ```

3. Customize variables for staging environment

4. Update GitHub Actions workflow to include new environment

## Cleanup

To destroy all infrastructure:

```bash
cd terraform/environments/dev
terraform destroy
```

**Warning:** This will delete all resources including the EKS cluster, VPC, and associated resources.

## Best Practices

1. **Version Control:** Always use version tags for modules
2. **State Management:** Use remote state (S3 + DynamoDB) for team collaboration
3. **Environment Separation:** Separate AWS accounts or VPCs per environment
4. **Cost Monitoring:** Enable AWS Cost Explorer and set up billing alerts
5. **Testing:** Test changes in dev before applying to production
6. **Documentation:** Keep this README and module docs up to date

## Contributing

When adding new modules or features:

1. Follow the existing module structure
2. Include README in each module
3. Add comprehensive variables and outputs
4. Update root module to integrate new features
5. Test thoroughly in dev environment

## Support

For issues or questions:
- Check the troubleshooting section
- Review AWS EKS documentation
- Open an issue in the GitHub repository

## License

This infrastructure code is part of the NT114 DevSecOps Project.
