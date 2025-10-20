# Local ArgoCD Deployment Guide

Complete guide to deploy and test ArgoCD with your microservices locally (without AWS).

## Prerequisites

- Docker Desktop running
- kubectl installed
- Helm installed
- Git

## Step 1: Start Local Kubernetes Cluster

### Option A: Docker Desktop (Recommended for Windows)

1. Open Docker Desktop
2. Go to Settings → Kubernetes
3. Check "Enable Kubernetes"
4. Click "Apply & Restart"
5. Wait for Kubernetes to start (green indicator)

**Verify:**
```bash
kubectl get nodes
```

### Option B: Minikube

```bash
# Start minikube
minikube start --driver=docker --memory=4096 --cpus=2

# Verify
kubectl get nodes
```

### Option C: kind

```bash
# Create cluster
kind create cluster --name nt114-local

# Verify
kubectl get nodes
```

---

## Step 2: Build Docker Images Locally

**If using Minikube**, set Docker environment:
```bash
eval $(minikube docker-env)
```

**For Docker Desktop or kind**, use your regular Docker:

### Build Frontend
```bash
cd frontend
docker build -t frontend:local .
cd ..
```

### Build Microservices
```bash
cd microservices

# Build API Gateway
docker build -t api-gateway:local ./api-gateway

# Build User Management Service
docker build -t user-management-service:local ./user-management-service

# Build Exercises Service
docker build -t exercises-service:local ./exercises-service

# Build Scores Service
docker build -t scores-service:local ./scores-service

cd ..
```

**Verify images:**
```bash
docker images | grep local
```

---

## Step 3: Install ArgoCD

### Install ArgoCD components
```bash
# Create namespace
kubectl create namespace argocd

# Apply admin credentials BEFORE installing ArgoCD
kubectl apply -f argocd/setup-admin-account.yaml

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready (this may take 2-3 minutes)
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
```

**Note:** The `setup-admin-account.yaml` file sets the admin password to "admin" for easier local testing

### Access ArgoCD UI

**Start port-forward (keep this terminal open):**
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**Access ArgoCD:**
- URL: https://localhost:8080
- Username: `admin`
- Password: `admin`
- Accept the self-signed certificate warning

---

## Step 4: Deploy Applications with Helm (Direct Method)

Since you're testing locally, deploy directly with Helm first (simpler than ArgoCD for local testing):

### Deploy Frontend
```bash
helm install frontend ./helm/frontend -f ./helm/frontend/values-local.yaml
```

### Deploy API Gateway
```bash
helm install api-gateway ./helm/api-gateway -f ./helm/api-gateway/values-local.yaml
```

### Deploy Microservices
```bash
helm install user-management-service ./helm/user-management-service -f ./helm/user-management-service/values-local.yaml

helm install exercises-service ./helm/exercises-service -f ./helm/exercises-service/values-local.yaml

helm install scores-service ./helm/scores-service -f ./helm/scores-service/values-local.yaml
```

---

## Step 5: Verify Deployment

### Check all pods are running
```bash
kubectl get pods

# Wait until all pods show STATUS: Running
```

### Check services
```bash
kubectl get svc
```

### View logs
```bash
# Frontend logs
kubectl logs -l app.kubernetes.io/name=frontend

# API Gateway logs
kubectl logs -l app.kubernetes.io/name=api-gateway
```

---

## Step 6: Access Applications

### Frontend
```bash
# If using Minikube
minikube service frontend

# If using Docker Desktop or kind
kubectl port-forward svc/frontend 3000:80
# Then access: http://localhlhost:3000
```

### API Gateway
```bash
# If using Minikube
minikube service api-gateway

# If using Docker Desktop or kind
kubectl port-forward svc/api-gateway 8080:8080
# Then access: http://localhost:8080
```

---

## Step 7: Deploy with ArgoCD (GitOps Method)

### Option 1: Using Local Git Repository

Create local ArgoCD application manifests:

```bash
# Create a local application for frontend
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend-local
  namespace: argocd
spec:
  project: default
  source:
    repoURL: file:///path/to/NT114_DevSecOps_Project
    targetRevision: HEAD
    path: helm/frontend
    helm:
      valueFiles:
        - values-local.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
```

**Note:** Replace `/path/to/NT114_DevSecOps_Project` with your actual project path.

### Option 2: Using GitHub Repository

First, commit and push the local values files to your GitHub repository:

```bash
git add helm/*/values-local.yaml
git add LOCAL_DEPLOYMENT.md
git commit -m "Add local deployment configuration"
git push
```

Then create ArgoCD applications pointing to GitHub:

```bash
# Create frontend application
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend-local
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/NT114DevSecOpsProject/NT114_DevSecOps_Project.git
    targetRevision: main
    path: helm/frontend
    helm:
      valueFiles:
        - values-local.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
```

Repeat for other services (api-gateway, user-management-service, exercises-service, scores-service).

---

## Testing ArgoCD Features

### Test 1: Automatic Sync

1. Make a change to `helm/frontend/values-local.yaml` (e.g., change replicaCount to 2)
2. Commit and push to GitHub
3. Watch ArgoCD detect and sync the change:
   ```bash
   kubectl get applications -n argocd -w
   ```
4. Verify in ArgoCD UI

### Test 2: Self-Healing

1. Manually delete a pod:
   ```bash
   kubectl delete pod -l app.kubernetes.io/name=frontend
   ```
2. Watch ArgoCD recreate it automatically
3. Check in ArgoCD UI - should show "Synced" status

### Test 3: Manual Sync

1. In ArgoCD UI, click on an application
2. Click "Sync" button
3. Watch resources being updated

### Test 4: Rollback

1. Make a change and deploy (e.g., update image tag)
2. In ArgoCD UI, go to application → "History and Rollback"
3. Select a previous revision
4. Click "Rollback"
5. Verify application reverts to previous state

---

## Monitoring and Debugging

### Check ArgoCD application status
```bash
kubectl get applications -n argocd
```

### Describe an application
```bash
kubectl describe application frontend-local -n argocd
```

### View ArgoCD server logs
```bash
kubectl logs -n argocd deployment/argocd-server
```

### View application events
```bash
kubectl get events --sort-by='.lastTimestamp'
```

### Check pod status
```bash
kubectl get pods -o wide
```

### Describe a problematic pod
```bash
kubectl describe pod <pod-name>
```

---

## Common Issues and Solutions

### Issue 1: Pods in ImagePullBackOff

**Cause:** Kubernetes trying to pull from registry instead of using local image

**Solution:** Ensure `imagePullPolicy: Never` in values-local.yaml and rebuild image

```bash
# If using Minikube, set Docker environment first
eval $(minikube docker-env)

# Rebuild the image
docker build -t frontend:local ./frontend
```

### Issue 2: Pods in CrashLoopBackOff

**Cause:** Application error

**Solution:** Check logs
```bash
kubectl logs <pod-name>
kubectl describe pod <pod-name>
```

### Issue 3: ArgoCD shows "OutOfSync"

**Cause:** Local changes don't match Git

**Solution:** Either:
- Commit and push changes to Git
- Click "Sync" in ArgoCD UI to force sync

### Issue 4: Cannot access ArgoCD UI

**Solution:**
1. Ensure port-forward is running:
   ```bash
   kubectl port-forward svc/argocd-server -n argocd 8080:443
   ```
2. Access https://localhost:8080 (note: https, not http)
3. Accept self-signed certificate warning

---

## Clean Up

### Delete applications
```bash
# If deployed with Helm
helm uninstall frontend api-gateway user-management-service exercises-service scores-service

# If deployed with ArgoCD
kubectl delete application -n argocd frontend-local api-gateway-local
```

### Delete ArgoCD
```bash
kubectl delete namespace argocd
```

### Stop Kubernetes cluster

**Docker Desktop:** Disable Kubernetes in settings

**Minikube:**
```bash
minikube stop
# Or delete entirely:
minikube delete
```

**kind:**
```bash
kind delete cluster --name nt114-local
```

---

## Next Steps

After testing locally:
1. Deploy to AWS EKS using the main [DEPLOYMENT.md](DEPLOYMENT.md) guide
2. Configure CI/CD pipelines
3. Set up monitoring and logging
4. Implement security scanning

## Quick Reference

```bash
# Check cluster
kubectl get nodes

# Check all resources
kubectl get all

# Port-forward ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Port-forward frontend
kubectl port-forward svc/frontend 3000:80

# Port-forward API Gateway
kubectl port-forward svc/api-gateway 8080:8080

# View logs
kubectl logs -f <pod-name>

# List ArgoCD applications
kubectl get applications -n argocd

# Apply ArgoCD admin credentials
kubectl apply -f argocd/argocd-admin-secret.yaml
```
