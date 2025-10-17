# ArgoCD - GitOps Continuous Deployment

This directory contains ArgoCD configurations for GitOps-based continuous deployment of the NT114 DevSecOps project on Kubernetes.

## What is ArgoCD?

ArgoCD is a declarative, GitOps continuous delivery tool for Kubernetes. It:
- Monitors Git repositories for application definitions
- Automatically syncs desired state to the cluster
- Provides visualization of deployment status
- Enables rollback and history tracking
- Supports multiple deployment strategies

## Directory Structure

```
argocd/
├── projects/
│   └── nt114-devsecops.yaml      # ArgoCD project definition
├── applications/
│   ├── frontend.yaml             # Frontend application
│   ├── api-gateway.yaml          # API Gateway application
│   ├── user-management-service.yaml
│   ├── exercises-service.yaml
│   └── scores-service.yaml
├── install-argocd.sh             # ArgoCD installation script
└── deploy-all.sh                 # Deploy all applications script
```

## Prerequisites

1. **EKS Cluster**: Running Kubernetes cluster
2. **kubectl**: Configured to access your cluster
3. **AWS Load Balancer Controller**: Installed on the cluster
4. **Helm Charts**: Available in the repository
5. **Docker Images**: Pushed to ECR

## Installation

### Step 1: Install ArgoCD

Run the installation script:

```bash
cd argocd
./install-argocd.sh
```

This script will:
1. Create the `argocd` namespace
2. Install ArgoCD components
3. Patch the server service for LoadBalancer access
4. Display admin credentials and URL

### Step 2: Access ArgoCD UI

After installation, you'll see output like:

```
ArgoCD URL: https://xxx.elb.us-east-1.amazonaws.com
Username: admin
Password: <generated-password>
```

Open the URL in your browser and login with these credentials.

### Step 3: Install ArgoCD CLI (Optional)

```bash
# Download ArgoCD CLI
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64

# Make it executable
chmod +x /usr/local/bin/argocd

# Login via CLI
argocd login <ARGOCD_URL>
```

## Configuration

### Update Repository URL

Before deploying, update the repository URL in all application manifests:

```bash
# Find and replace in all application files
find argocd/applications -name "*.yaml" -exec sed -i 's|<YOUR_ORG>/<YOUR_REPO>|your-org/your-repo|g' {} \;
```

Or manually edit each file in `argocd/applications/`:

```yaml
spec:
  source:
    repoURL: https://github.com/<YOUR_ORG>/<YOUR_REPO>.git
    targetRevision: main
```

### Update Image Repositories

Update AWS account ID in application manifests:

```bash
# Replace AWS_ACCOUNT_ID in all files
find argocd/applications -name "*.yaml" -exec sed -i 's|<AWS_ACCOUNT_ID>|123456789012|g' {} \;
```

## Deployment

### Deploy All Applications

Use the deployment script:

```bash
./deploy-all.sh
```

This will:
1. Create the ArgoCD project
2. Deploy all application definitions
3. ArgoCD will automatically sync applications

### Deploy Individual Application

```bash
kubectl apply -f argocd/applications/frontend.yaml
```

### Monitor Deployment

#### Via UI
- Open ArgoCD UI
- View application cards showing sync status
- Click on an application for detailed view

#### Via CLI

```bash
# List all applications
argocd app list

# Get application details
argocd app get frontend

# Watch sync status
argocd app wait frontend
```

#### Via kubectl

```bash
# List applications
kubectl get applications -n argocd

# Describe application
kubectl describe application frontend -n argocd
```

## ArgoCD Project

The `nt114-devsecops` project defines:

```yaml
spec:
  # Source repositories allowed
  sourceRepos:
    - '*'

  # Destination clusters and namespaces
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc

  # Allowed resource types
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
```

**Note**: In production, restrict these permissions to specific repos, namespaces, and resources.

## Application Configuration

Each application defines:

### Source
- **repoURL**: Git repository containing Helm charts
- **targetRevision**: Branch or tag to deploy
- **path**: Path to Helm chart in repository

### Sync Policy
```yaml
syncPolicy:
  automated:
    prune: true          # Delete resources not in Git
    selfHeal: true       # Auto-sync on cluster changes
    allowEmpty: false    # Prevent empty app creation
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
  retry:
    limit: 5
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

## Sync Strategies

### Automatic Sync

Applications are configured for automatic sync:
- **Prune**: Removes resources deleted from Git
- **Self-Heal**: Reverts manual changes to match Git

### Manual Sync

Disable auto-sync for manual control:

```yaml
syncPolicy:
  automated: null  # Disable auto-sync
```

Sync manually:

```bash
# Sync via CLI
argocd app sync frontend

# Sync via UI
# Click "Sync" button in application view
```

## Operations

### Update Application

1. Update Helm chart or values in Git repository
2. Commit and push changes
3. ArgoCD automatically detects and syncs changes

Or update image tag:

```bash
argocd app set frontend --helm-set image.tag=v2.0.0
```

### Rollback

#### Via UI
1. Click on application
2. Go to "History and Rollback"
3. Select previous revision
4. Click "Rollback"

#### Via CLI

```bash
# List history
argocd app history frontend

# Rollback to specific revision
argocd app rollback frontend <revision-id>
```

### Delete Application

```bash
# Via CLI
argocd app delete frontend

# Via kubectl
kubectl delete application frontend -n argocd
```

## Health Checks

ArgoCD monitors application health:

- **Healthy**: All resources are healthy
- **Progressing**: Deployment in progress
- **Degraded**: Some resources unhealthy
- **Suspended**: Application suspended

Health is determined by:
- Deployment readiness
- Pod status
- Service endpoints
- Custom health checks

## Sync Status

- **Synced**: Git state matches cluster state
- **OutOfSync**: Cluster differs from Git
- **Unknown**: Unable to determine sync status

## Notifications

Configure notifications for sync events:

```yaml
# Install notifications controller
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-notifications/release-1.0/manifests/install.yaml
```

Configure Slack, email, or webhook notifications.

## Multi-Environment Setup

For multiple environments (dev, staging, prod):

### Option 1: Separate Branches

```yaml
# Dev environment
spec:
  source:
    targetRevision: dev

# Production environment
spec:
  source:
    targetRevision: main
```

### Option 2: Separate Helm Values

```yaml
# Dev environment
spec:
  source:
    helm:
      valueFiles:
        - values-dev.yaml

# Production environment
spec:
  source:
    helm:
      valueFiles:
        - values-prod.yaml
```

### Option 3: Separate Directories

```
helm/
├── dev/
│   └── frontend/
└── prod/
    └── frontend/
```

```yaml
spec:
  source:
    path: helm/prod/frontend
```

## Security Best Practices

1. **RBAC**: Configure role-based access control
2. **SSO**: Enable SSO authentication (OIDC, SAML)
3. **Secrets**: Use Sealed Secrets or External Secrets Operator
4. **Audit**: Enable audit logging
5. **Network**: Restrict ArgoCD server access
6. **Git Access**: Use deploy keys or SSH keys
7. **Image Scanning**: Integrate with Trivy or similar

## Troubleshooting

### Application OutOfSync

```bash
# Check sync status
argocd app get frontend

# View differences
argocd app diff frontend

# Force sync
argocd app sync frontend --force
```

### Sync Fails

```bash
# View sync logs
argocd app logs frontend

# Describe application
kubectl describe application frontend -n argocd
```

### ArgoCD Server Unreachable

```bash
# Check server status
kubectl get pods -n argocd

# View server logs
kubectl logs -n argocd deployment/argocd-server

# Restart server
kubectl rollout restart deployment/argocd-server -n argocd
```

### Application Stuck Progressing

```bash
# Check resource status
argocd app resources frontend

# View resource details
kubectl describe deployment frontend
```

## Monitoring

### View Sync Metrics

```bash
# Sync status
argocd app list --output wide

# Sync history
argocd app history frontend

# Watch sync progress
watch kubectl get applications -n argocd
```

### Prometheus Metrics

ArgoCD exposes Prometheus metrics:
- `argocd_app_sync_total`
- `argocd_app_health_status`
- `argocd_app_reconcile_count`

## Cleanup

### Uninstall Applications

```bash
# Delete all applications
kubectl delete -f argocd/applications/

# Or via CLI
argocd app delete --all
```

### Uninstall ArgoCD

```bash
# Delete ArgoCD
kubectl delete -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Delete namespace
kubectl delete namespace argocd
```

## Advanced Features

### App of Apps Pattern

Create a "parent" application that manages child applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
spec:
  source:
    path: argocd/applications/
  syncPolicy:
    automated: {}
```

### Sync Waves

Control deployment order with sync waves:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

### Hooks

Use hooks for pre/post-sync operations:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
```

## Best Practices

1. **Git as Source of Truth**: Never make manual changes to cluster
2. **Separate Repos**: Consider separate repos for app code and manifests
3. **Environment Promotion**: Use branches or tags for environment promotion
4. **Automated Testing**: Test manifest changes in CI/CD
5. **Monitoring**: Set up alerts for sync failures
6. **Documentation**: Keep application definitions well-documented
7. **Access Control**: Implement least privilege access

## Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Helm Charts README](../helm/README.md)
- [Terraform Infrastructure](../terraform/README.md)

## Support

For issues or questions:
- Check ArgoCD logs: `kubectl logs -n argocd deployment/argocd-server`
- Review application events: `argocd app get <app-name>`
- Open an issue in the GitHub repository
