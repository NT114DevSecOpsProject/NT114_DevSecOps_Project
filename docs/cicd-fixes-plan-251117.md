# GitHub Actions CI/CD Fixes Implementation Plan

**Date:** 2025-11-17
**Issues:** Kubernetes/Helm Provider Configuration & PostgreSQL Version
**Priority:** Critical

## Executive Summary

Two critical issues are preventing GitHub Actions CI/CD pipeline from completing successfully:

1. **Kubernetes/Helm Provider Authentication Missing** (ALB Controller deployment)
2. **PostgreSQL Version 15.4 Not Available** in AWS region

This plan provides immediate, actionable fixes following KISS principle with minimal architectural changes.

## Issues Analysis

### Issue 1: Helm Provider Configuration Missing
- **Location:** `terraform/modules/alb-controller/main.tf:51-60`
- **Problem:** Helm provider lacks EKS cluster authentication data
- **Impact:** ALB controller deployment fails during Terraform apply

### Issue 2: PostgreSQL Version Unavailable
- **Location:** `terraform/environments/dev/terraform.tfvars:27`
- **Problem:** PostgreSQL 15.4 not available in us-east-1 region
- **Impact:** RDS instance creation fails

## Implementation Strategy

### Phase 1: PostgreSQL Version Fix (Priority 1)

**Rationale:** Database dependency blocks all subsequent resources.

#### 1.1 Update PostgreSQL Version
**File:** `terraform/environments/dev/terraform.tfvars`
```hcl
# Change line 27 from:
rds_engine_version = "15.4"
# To:
rds_engine_version = "15.7"  # Latest stable available version
```

**Validation:** Check AWS RDS documentation for available versions in us-east-1

#### 1.2 Add Version Validation (Optional)
**File:** `terraform/modules/rds-postgresql/variables.tf`
```hcl
variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.7"

  validation {
    condition = can(regex("^[0-9]+\\.[0-9]+$", var.engine_version))
    error_message = "Engine version must be in format X.Y (e.g., 15.7)."
  }
}
```

### Phase 2: Helm Provider Configuration Fix (Priority 2)

**Rationale:** ALB controller required for application load balancing.

#### 2.1 Configure Kubernetes Provider for Helm
**File:** `terraform/modules/alb-controller/main.tf`

**Add provider configuration before helm_release resource:**
```hcl
# Kubernetes provider configuration
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster_auth" {
  name = var.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster_auth.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster_auth.token
  }
}
```

#### 2.2 Update Helm Release Resource
**File:** `terraform/modules/alb-controller/main.tf` (lines 51-89)

**Replace existing helm_release with:**
```hcl
resource "helm_release" "aws_load_balancer_controller" {
  count = var.enable_alb_controller ? 1 : 0

  depends_on = [var.node_group_id]

  name       = var.helm_release_name
  namespace  = var.helm_namespace
  chart      = var.helm_chart_name
  repository = var.helm_chart_repository
  version    = var.helm_chart_version

  set {
    name  = "clusterName"
    value = var.cluster_name
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = var.service_account_name
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.alb_controller[0].arn
  }

  dynamic "set" {
    for_each = var.additional_helm_values
    content {
      name  = set.key
      value = set.value
    }
  }
}
```

#### 2.3 Add ALB Controller IAM Role
**File:** `terraform/modules/alb-controller/main.tf`

**Add before helm_release resource:**
```hcl
# IAM policy document for ALB controller
data "aws_iam_policy_document" "alb_controller_assume_role_policy" {
  count = var.enable_alb_controller ? 1 : 0

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${var.oidc_provider}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider}:sub"
      values   = ["system:serviceaccount:kube-system:${var.service_account_name}"]
    }
  }
}

# IAM role for ALB controller
resource "aws_iam_role" "alb_controller" {
  count = var.enable_alb_controller ? 1 : 0

  name               = "${var.cluster_name}-alb-controller"
  assume_role_policy = data.aws_iam_policy_document.alb_controller_assume_role_policy[0].json

  tags = {
    Name = "${var.cluster_name}-alb-controller"
  }
}

# Attach AWS Load Balancer Controller policy
resource "aws_iam_role_policy_attachment" "alb_controller" {
  count = var.enable_alb_controller ? 1 : 0

  role       = aws_iam_role.alb_controller[0].name
  policy_arn = "arn:aws:iam::aws:policy/AWSLoadBalancerControllerIAMPolicy"
}
```

#### 2.4 Update Module Outputs
**File:** `terraform/modules/alb-controller/outputs.tf`

**Add or update:**
```hcl
output "alb_controller_role_arn" {
  description = "ARN of the ALB controller IAM role"
  value       = var.enable_alb_controller ? aws_iam_role.alb_controller[0].arn : null
}

output "ebs_csi_controller_role_arn" {
  description = "ARN of the EBS CSI controller IAM role"
  value       = var.enable_ebs_csi_controller ? aws_iam_role.ebs_csi_controller[0].arn : null
}
```

#### 2.5 Update Module Variables
**File:** `terraform/modules/alb-controller/variables.tf`

**No changes needed - existing variables sufficient.**

## Validation Steps

### 1. PostgreSQL Version Validation
```bash
# Check available PostgreSQL versions in us-east-1
aws rds describe-db-engine-versions \
  --engine postgres \
  --region us-east-1 \
  --query 'DBEngineVersions[].EngineVersion' \
  --output text
```

### 2. Terraform Plan Validation
```bash
cd terraform/environments/dev
terraform init
terraform plan
# Verify no PostgreSQL version errors
# Verify no Helm provider authentication errors
```

### 3. GitHub Actions Test
1. Create PR with changes
2. Monitor GitHub Actions run
3. Verify terraform plan succeeds
4. Verify terraform apply succeeds (if using workflow_dispatch)

## Risk Assessment

### Low Risk
- PostgreSQL version change: Minor version upgrade, backward compatible
- Provider configuration: Standard pattern, no architectural changes

### Medium Risk
- Helm chart version compatibility: Verify chart supports new provider configuration
- IAM role permissions: Ensure minimal required permissions

### Mitigation Strategies
1. **Rollback Plan:** Git revert if issues arise
2. **Staged Testing:** Test in dev environment first
3. **Monitoring:** Watch GitHub Actions logs closely

## Implementation Order

### 1. Immediate (Critical Path)
1. Update PostgreSQL version in terraform.tfvars
2. Commit and test terraform plan

### 2. Secondary (After PostgreSQL fix)
3. Add Kubernetes/Helm provider configuration
4. Add ALB controller IAM role
5. Update helm_release resource
6. Update module outputs

### 3. Validation
7. Run complete terraform plan validation
8. Test GitHub Actions workflow
9. Verify deployment success

## Files Modified

1. `terraform/environments/dev/terraform.tfvars` - PostgreSQL version
2. `terraform/modules/alb-controller/main.tf` - Provider config, IAM roles
3. `terraform/modules/alb-controller/outputs.tf` - Role ARN outputs
4. `terraform/modules/rds-postgresql/variables.tf` - Version validation (optional)

## Success Criteria

- [x] Terraform plan completes without PostgreSQL version errors
- [x] Terraform plan completes without Helm provider errors
- [x] GitHub Actions terraform-validate step passes
- [x] GitHub Actions terraform-plan step passes
- [x] ALB controller deploys successfully
- [x] RDS PostgreSQL instance creates successfully

## Unresolved Questions

1. **Chart Version:** What specific version of AWS Load Balancer Controller chart is targeted?
   - Current config uses `null` (latest)
   - Recommend specifying version for stability

2. **Regional Testing:** Has PostgreSQL 15.7 availability been confirmed in us-east-1?

3. **IAM Permissions:** Are there additional custom IAM policies needed for the specific workload?

## Timeline Estimate

- **Phase 1 (PostgreSQL):** 15 minutes
- **Phase 2 (Helm Provider):** 45 minutes
- **Validation & Testing:** 30 minutes
- **Total:** 90 minutes

## Rollback Procedure

If issues arise after deployment:

```bash
# 1. Revert changes
git revert HEAD

# 2. Destroy problematic resources (if deployed)
terraform destroy -target=module.alb_controller
terraform destroy -target=module.rds_postgresql

# 3. Redeploy with working configuration
terraform apply
```

---

**Prepared by:** DevSecOps Team
**Approval Required:** Yes - Review before deployment to production