# ArgoCD Setup for NT114 DevSecOps Project

## Overview

ArgoCD is configured to manage all application deployments using GitOps principles. All applications sync automatically from the Git repository.

## ArgoCD Access

### Web UI

**URL**: http://ace85fb1b2b1b4ba5b7d0c45a02c1f46-1313714481.us-east-1.elb.amazonaws.com

**Credentials**:
- Username: `admin`
- Password: `0AuDbI2BAgFvEPlL`

### CLI Login

```bash
argocd login ace85fb1b2b1b4ba5b7d0c45a02c1f46-1313714481.us-east-1.elb.amazonaws.com \
  --username admin \
  --password 0AuDbI2BAgFvEPlL \
  --insecure
```

## Managed Applications

All applications are deployed to the `dev` namespace:

1. **api-gateway** - API Gateway service
2. **user-management-service** - User authentication and management
3. **exercises-service** - Exercises management
4. **scores-service** - Scoring system
5. **frontend** - React frontend application

## Application Sync Policy

All applications are configured with:
- **Automated Sync**: Changes in Git automatically deploy
- **Self-Heal**: ArgoCD automatically fixes manual changes
- **Prune**: Removes resources deleted from Git

## Deployment Workflow

### Automatic Deployment (Recommended)

1. Make changes to Helm charts in `helm/` directory
2. Commit and push to main branch
3. ArgoCD automatically detects and deploys changes
4. Monitor sync status in ArgoCD UI

### Manual Sync

```bash
# Sync specific application
argocd app sync api-gateway

# Sync all applications
argocd app sync -l app.kubernetes.io/instance

# Force sync (ignore cache)
argocd app sync api-gateway --force
```

## Monitoring

### Check Application Status

```bash
# Via kubectl
kubectl get applications -n argocd

# Via argocd CLI
argocd app list

# Get detailed app info
argocd app get api-gateway
```

### View Sync History

```bash
argocd app history api-gateway
```

### View Application Details

In ArgoCD UI:
1. Click on application name
2. View resource tree
3. Check sync status and health
4. View recent events and logs

## Troubleshooting

### Application Out of Sync

```bash
# Check what changed
argocd app diff api-gateway

# View sync errors
argocd app get api-gateway

# Force sync
argocd app sync api-gateway --force
```

### Application Unhealthy

```bash
# Check pod status
kubectl get pods -n dev

# Check application logs
argocd app logs api-gateway

# View application events
kubectl describe app api-gateway -n argocd
```

### Sync Failed

Common causes:
1. **Invalid Helm values**: Check values-eks.yaml syntax
2. **Resource conflicts**: Check for duplicate resources
3. **Network issues**: Verify cluster connectivity

Solutions:
```bash
# View detailed error
argocd app get api-gateway

# Delete and recreate application
kubectl delete app api-gateway -n argocd
kubectl apply -f argocd/applications/api-gateway.yaml
```

## Adding New Applications

1. Create new Helm chart in `helm/` directory
2. Create ArgoCD Application manifest:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: new-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/NT114DevSecOpsProject/NT114_DevSecOps_Project.git
    targetRevision: main
    path: helm/new-service
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
```

3. Apply manifest:
```bash
kubectl apply -f argocd/applications/new-service.yaml
```

## Updating Applications

### Update Application Configuration

1. Edit Helm values: `helm/<service>/values-eks.yaml`
2. Commit and push changes
3. ArgoCD automatically syncs (within 3 minutes)

### Update Application Manifest

1. Edit `argocd/applications/<service>.yaml`
2. Apply changes:
```bash
kubectl apply -f argocd/applications/<service>.yaml
```

## Rollback

### Via ArgoCD UI

1. Go to application page
2. Click "History and Rollback"
3. Select previous version
4. Click "Rollback"

### Via CLI

```bash
# View history
argocd app history api-gateway

# Rollback to specific revision
argocd app rollback api-gateway <revision-id>
```

## Change Admin Password

```bash
# Via kubectl
kubectl -n argocd patch secret argocd-secret \
  -p '{"stringData": {"admin.password": "'$(htpasswd -bnBC 10 "" new-password | tr -d ':\n')'"}}'

# Via argocd CLI
argocd account update-password
```

## Uninstall ArgoCD

⚠️ **Warning**: This will delete all ArgoCD resources but NOT the managed applications.

```bash
kubectl delete -n argocd -f argocd-install.yaml
kubectl delete namespace argocd
```

To also delete managed applications:
```bash
kubectl delete namespace dev
```

## Best Practices

1. **Never manually edit resources**: Always update via Git
2. **Use separate branches**: Test changes in feature branches first
3. **Monitor sync status**: Check ArgoCD UI regularly
4. **Use ApplicationSets**: For multiple environments
5. **Enable notifications**: Get alerts on sync failures

## References

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Best Practices](https://www.gitops.tech/)
- [Helm Charts](../helm/)
