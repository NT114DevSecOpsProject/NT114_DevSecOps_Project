# API Gateway Deployment Issues - Comprehensive Implementation Plan

## Executive Summary

Critical configuration inconsistencies identified causing API Gateway deployment failures. Primary issue: EKS version mismatch between variable defaults (1.33) and actual configuration (1.31). This plan provides systematic fixes with rollback procedures.

## Issues Identified

### 1. Critical: EKS Version Mismatch
- **File**: `terraform/environments/dev/variables.tf` line 89: `default = "1.33"`
- **File**: `terraform/environments/dev/terraform.tfvars` line 16: `cluster_version = "1.31"`
- **Impact**: Terraform uses 1.31 (from tfvars) but potential confusion exists

### 2. High: ALB Controller Version Compatibility
- **Current**: Helm chart version "1.15.0" in ALB controller module
- **Risk**: May not be compatible with EKS 1.33 if upgraded
- **Uncertainty**: Compatibility matrix not verified

### 3. Medium: Replica Count Inconsistency
- **Terraform**: `replicaCount: 2` in helm-release.tf
- **Helm Values**: `replicaCount: 1` in values.yaml
- **Impact**: Potential override conflicts

## Implementation Strategy

### Phase 1: Immediate Stabilization (Conservative Approach)

#### 1.1 Fix Version Consistency
**Action**: Update variables.tf default to match current deployment
```bash
# File: terraform/environments/dev/variables.tf line 89
variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.31"  # Changed from "1.33" to match tfvars
}
```

**Rationale**:
- Maintains current working deployment
- Eliminates configuration confusion
- Zero-risk change

#### 1.2 Verify ALB Controller Compatibility (EKS 1.31)
**Research Needed**: Confirm Helm chart v1.15.0 compatibility
```bash
# Check AWS Load Balancer Controller documentation
# Verify v1.15.0 supports EKS 1.31
# Confirm no breaking changes
```

#### 1.3 Fix Replica Count Alignment
**Action**: Standardize on single replica for consistency
```yaml
# File: terraform/modules/alb-controller/helm-release.tf line 47-49
set {
  name  = "replicaCount"
  value = 1  # Changed from 2 to match values.yaml
}
```

### Phase 2: Validation and Testing

#### 2.1 Terraform Validation
```bash
cd terraform/environments/dev
terraform fmt
terraform validate
terraform plan -out=tfplan-alb-fix
```

#### 2.2 Test Deployment
```bash
# Deploy with corrected configuration
terraform apply tfplan-alb-fix

# Verify ALB controller deployment
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

#### 2.3 API Gateway Test
```bash
# Test API Gateway service
kubectl get ingress -A
kubectl describe ingress api-gateway
curl -I http://$(kubectl get ingress api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/health
```

### Phase 3: Documentation Update

#### 3.1 Update Configuration Standards
**File**: `docs/code-standards.md`
- Add version compatibility requirements
- Document replica count standards
- Include IRSA configuration guidelines

#### 3.2 Update Deployment Guide
**File**: `docs/deployment-guide.md`
- Add troubleshooting section for ALB controller
- Include version compatibility matrix
- Document rollback procedures

## Optional Phase 4: EKS Upgrade (Future Enhancement)

### 4.1 Pre-Upgrade Requirements
- Verify AWS Load Balancer Controller v2.6+ compatibility with EKS 1.33
- Test upgrade in non-production environment
- Update all Helm charts to latest compatible versions

### 4.2 Upgrade Process
```bash
# 1. Update terraform.tfvars
cluster_version = "1.33"

# 2. Update ALB controller Helm chart version
helm_chart_version = "v2.6.0"  # Or latest compatible

# 3. Plan and apply changes
terraform plan -out=tfplan-eks-upgrade
terraform apply tfplan-eks-upgrade
```

## Rollback Procedures

### Immediate Rollback
```bash
# If deployment fails
cd terraform/environments/dev
terraform destroy -auto-approve
git checkout HEAD~1 -- terraform/environments/dev/terraform.tfvars
terraform apply
```

### Configuration Rollback
```bash
# Revert variables.tf if issues occur
git checkout HEAD~1 -- terraform/environments/dev/variables.tf
terraform apply
```

## Testing Checklist

### Pre-Deployment
- [ ] Terraform validation passes
- [ ] Configuration files consistent
- [ ] No syntax errors in Helm values
- [ ] IRSA configuration verified

### Post-Deployment
- [ ] EKS cluster healthy
- [ ] ALB controller pods running
- [ ] Service account annotations correct
- [ ] Ingress resources created
- [ ] API Gateway accessible via ALB
- [ ] Health checks passing

### Validation Commands
```bash
# Cluster health
kubectl get nodes
kubectl get pods -A

# ALB Controller status
kubectl get deployment aws-load-balancer-controller -n kube-system
kubectl get serviceaccount aws-load-balancer-controller -n kube-system -o yaml

# Ingress status
kubectl get ingress api-gateway -o yaml
```

## Monitoring and Alerting

### Key Metrics
- ALB controller pod health
- Ingress response times
- HTTP 5xx error rates
- Target group health checks

### Log Monitoring
```bash
# ALB Controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller --tail=100

# API Gateway logs
kubectl logs -l app=api-gateway --tail=100
```

## Success Criteria

1. **Configuration Consistency**: All version references aligned
2. **Deployment Success**: Terraform apply completes without errors
3. **Service Health**: ALB controller and API Gateway pods healthy
4. **Functionality**: API Gateway accessible via ALB endpoint
5. **Documentation Updated**: All changes documented in guides

## Timeline

- **Phase 1**: 2-4 hours (immediate fixes)
- **Phase 2**: 2-3 hours (testing and validation)
- **Phase 3**: 1-2 hours (documentation updates)
- **Phase 4**: Future enhancement (requires separate planning)

## Risk Mitigation

### High Risk
- EKS version upgrade deferred until compatibility verified
- All changes tested in current environment first

### Medium Risk
- Replica count changes tested for impact
- Rollback procedures documented and tested

### Low Risk
- Variable default changes have no impact on existing infrastructure
- Documentation updates only

## Unresolved Questions

1. What is the exact AWS Load Balancer Controller version compatibility with EKS 1.33?
2. Are there performance implications of replica count changes?
3. What monitoring/alerting should be implemented for ALB controller health?
4. Should we consider multiple ALB controller replicas for production?

## Next Steps

1. Execute Phase 1 fixes immediately
2. Validate deployment in current environment
3. Update documentation based on findings
4. Plan EKS upgrade for future iteration (if needed)