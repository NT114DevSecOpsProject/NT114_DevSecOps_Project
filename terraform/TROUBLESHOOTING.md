# Terraform Troubleshooting Guide

## Provider Configuration Issues

### Issue: Circular Dependency Error

**Symptoms:**
```
Error: Cycle: provider["registry.terraform.io/hashicorp/kubernetes"]
Error: Reference to undeclared module
```

**Root Cause:**
The Kubernetes and Helm providers are trying to reference the EKS cluster before it exists.

**Solution:**
The `environments/dev/providers.tf` file has been fixed with `try()` functions. See [environments/dev/PROVIDER_FIX.md](environments/dev/PROVIDER_FIX.md) for details.

**Quick Fix:**
```bash
cd terraform/environments/dev
terraform init
terraform validate
```

---

## Common Terraform Errors

### Error: "Invalid for_each argument"

**Solution:**
```bash
terraform init -upgrade
terraform apply -refresh=true
```

### Error: "Error acquiring the state lock"

**Cause:** Another Terraform process is running or was interrupted.

**Solution:**
```bash
# If using local state
rm -rf .terraform/terraform.tfstate

# If using remote state (S3)
terraform force-unlock <LOCK_ID>
```

### Error: "Module not installed"

**Solution:**
```bash
terraform init -upgrade
```

### Error: "Provider version mismatch"

**Solution:**
```bash
rm -rf .terraform.lock.hcl
terraform init -upgrade
```

---

## EKS-Specific Issues

### Issue: EKS Cluster Version Mismatch

**Symptoms:**
```
Error: EKS Node Group version must be at most 1.31
```

**Solution:**
Ensure `cluster_version` matches across:
- `terraform.tfvars`: `cluster_version = "1.31"`
- All module calls using `cluster_version`

**Check with:**
```bash
grep -r "cluster_version" terraform/environments/dev/
```

### Issue: Node Group Not Joining Cluster

**Symptoms:**
- Nodes show "NotReady" status
- Pods stuck in "Pending"

**Diagnosis:**
```bash
kubectl get nodes
kubectl describe node <node-name>
```

**Common Causes:**
1. **CoreDNS not running:** Check `kubectl get pods -n kube-system`
2. **VPC CNI issues:** Check security groups allow pod communication
3. **IAM permissions:** Verify node IAM role has required policies

**Solution:**
```bash
# Restart CoreDNS
kubectl rollout restart deployment coredns -n kube-system

# Check node logs
aws eks describe-nodegroup --cluster-name eks-1 --nodegroup-name eks-node
```

### Issue: AWS Load Balancer Controller Not Working

**Symptoms:**
- Ingress created but no ALB appears
- `kubectl get ingress` shows no ADDRESS

**Diagnosis:**
```bash
kubectl logs -n kube-system deployment/aws-load-balancer-controller
kubectl describe ingress <ingress-name>
```

**Common Causes:**
1. **IAM permissions:** IRSA role missing policies
2. **Subnets not tagged:** ELB tags missing
3. **Security groups:** Ports not open

**Solution:**
```bash
# Check controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Verify subnet tags
aws ec2 describe-subnets --filters "Name=tag:kubernetes.io/role/elb,Values=1"

# Check IRSA
kubectl describe sa aws-load-balancer-controller -n kube-system
```

---

## Module-Specific Issues

### VPC Module

**Issue: VPC CIDR Conflict**
```bash
# Check existing VPCs
aws ec2 describe-vpcs --region us-east-1
```

**Solution:** Change `vpc_cidr` in `terraform.tfvars`.

### EKS Cluster Module

**Issue: Cluster Endpoint Not Accessible**

**Solution:**
```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name eks-1

# Test connectivity
kubectl cluster-info
```

### Node Group Module

**Issue: Insufficient Capacity**

**Symptoms:**
```
Error: InsufficientInstanceCapacity
```

**Solution:**
1. Change instance type in `terraform.tfvars`:
   ```hcl
   node_instance_types = ["t3.medium"]
   ```
2. Change capacity type to ON_DEMAND:
   ```hcl
   node_capacity_type = "ON_DEMAND"
   ```

---

## State Management Issues

### Issue: State Drift

**Symptoms:**
- Resources exist in AWS but not in state
- Terraform wants to recreate existing resources

**Diagnosis:**
```bash
terraform plan -refresh-only
```

**Solution:**
```bash
# Import existing resource
terraform import module.vpc.module.vpc.aws_vpc.this <VPC_ID>

# Or refresh state
terraform apply -refresh-only
```

### Issue: Corrupted State

**Solution:**
```bash
# Backup current state
cp terraform.tfstate terraform.tfstate.backup

# Pull fresh state (if using remote backend)
terraform state pull > current.tfstate

# Or restore from backup
terraform state push terraform.tfstate.backup
```

---

## Deployment Workflow Issues

### Issue: GitHub Actions Failing

**Check workflow logs:**
```bash
gh run list --repo conghieu2004/NT114_DevSecOps_Project
gh run view <run-id>
```

**Common Issues:**
1. AWS credentials not configured
2. Terraform version mismatch
3. State lock not released

**Solution:**
Update GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

---

## Performance Issues

### Issue: Terraform Plan/Apply Too Slow

**Solutions:**

1. **Use parallelism:**
   ```bash
   terraform apply -parallelism=20
   ```

2. **Target specific modules:**
   ```bash
   terraform apply -target=module.vpc
   ```

3. **Enable plugin caching:**
   ```bash
   export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
   mkdir -p $TF_PLUGIN_CACHE_DIR
   ```

---

## Cleanup Issues

### Issue: Resources Not Deleting

**Symptoms:**
```
Error: waiting for deletion...timeout
```

**Common Culprits:**
- Load Balancers created by Kubernetes (not managed by Terraform)
- Security groups with dependencies
- ENIs attached to instances

**Solution:**
```bash
# Delete all Kubernetes resources first
kubectl delete ingress --all
kubectl delete svc --all --all-namespaces

# Wait for ALBs to be deleted (check AWS Console)

# Then destroy Terraform
terraform destroy
```

### Issue: Force Delete Stuck Resources

**Solution:**
```bash
# Remove from state (DANGEROUS - use with caution)
terraform state rm module.eks_nodegroup.aws_eks_node_group.eks_node

# Or target destroy
terraform destroy -target=module.eks_nodegroup
```

---

## Validation and Testing

### Validate Configuration

```bash
cd terraform/environments/dev

# Format code
terraform fmt -recursive

# Validate syntax
terraform validate

# Check for security issues (requires tfsec)
tfsec .

# Generate dependency graph
terraform graph | dot -Tsvg > graph.svg
```

### Test Deployment

```bash
# Dry run
terraform plan -out=tfplan

# Review plan
terraform show tfplan

# Apply with approval
terraform apply tfplan
```

---

## Best Practices to Avoid Issues

1. **Always run `terraform plan` before `terraform apply`**
2. **Use remote state (S3 + DynamoDB) for team collaboration**
3. **Enable state locking**
4. **Use consistent versioning for modules**
5. **Tag all resources for cost tracking**
6. **Use workspaces for environments**
7. **Keep Terraform version consistent across team**
8. **Review provider version constraints**

---

## Getting Help

1. **Check Terraform documentation:** https://registry.terraform.io/providers/hashicorp/aws/latest/docs
2. **Check EKS best practices:** https://aws.github.io/aws-eks-best-practices/
3. **Review module documentation:** See `terraform/modules/*/README.md`
4. **Check logs:** `kubectl logs` and CloudWatch Logs
5. **AWS Support:** For AWS-specific infrastructure issues

---

## Quick Reference Commands

```bash
# Terraform
terraform init                    # Initialize working directory
terraform validate               # Validate configuration
terraform plan                   # Preview changes
terraform apply                  # Apply changes
terraform destroy                # Destroy infrastructure
terraform state list            # List resources in state
terraform state show <resource> # Show resource details
terraform output                # Show outputs

# EKS
aws eks update-kubeconfig --region us-east-1 --name eks-1
aws eks describe-cluster --name eks-1
aws eks list-nodegroups --cluster-name eks-1

# kubectl
kubectl get nodes               # List nodes
kubectl get pods -A            # List all pods
kubectl describe pod <name>    # Describe pod
kubectl logs <pod>             # View logs
kubectl get events             # View events
```
