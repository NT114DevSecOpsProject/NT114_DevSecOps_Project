# Frontend Image Rebuild Status

## Issue
ArgoCD synced new Helm configuration from Git expecting frontend Docker image with custom entrypoint script, but ECR still contains old image without the entrypoint script changes.

## Root Cause
- Frontend code changes (docker-entrypoint.sh, nginx.conf, Dockerfile.prod) committed to Git in commit 57f323a
- Helm charts updated to use API_GATEWAY_URL environment variable
- Docker image on ECR not rebuilt, still missing entrypoint script
- ArgoCD synced Helm values triggering pod deployment with mismatched image
- New pods crash because they expect entrypoint script behavior that doesn't exist in image

## Actions Taken

### 1. Triggered GitHub Actions Build (Commit e418fdf)
```bash
git commit -m "chore: trigger frontend rebuild with entrypoint script"
git push origin main
```

This triggers `.github/workflows/frontend-build.yml` which will:
- Build Docker image using `frontend/Dockerfile.prod`
- Include new docker-entrypoint.sh script
- Push to ECR with tags: `latest` and `<commit-sha>`

### 2. Temporarily Disabled ArgoCD Auto-Sync
```bash
kubectl patch app frontend -n argocd --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}'
```

This prevents ArgoCD from continuously creating new pods with old image while waiting for build.

### 3. Rollback Frontend Deployment
```bash
kubectl rollout undo deployment frontend -n dev
```

This keeps application running on old stable pods (frontend-6c9d6cb44d-*) until new image is ready.

## Expected Timeline

1. **GitHub Actions Build** (~5-8 minutes)
   - Build frontend Docker image with entrypoint script
   - Push to ECR as `latest` tag

2. **Manual Image Pull** (after build completes)
   ```bash
   # Force ArgoCD to pull new image
   kubectl rollout restart deployment frontend -n dev

   # Or manually sync in ArgoCD
   argocd app sync frontend
   ```

3. **Re-enable Auto-Sync** (after verification)
   ```bash
   kubectl patch app frontend -n argocd --type merge -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
   ```

## Verification Steps

### Check GitHub Actions Build Status
```bash
# Via GitHub web UI
https://github.com/NT114DevSecOpsProject/NT114_DevSecOps_Project/actions

# Or list recent workflow runs (requires gh CLI authentication)
gh run list --workflow=frontend-build.yml
```

### Check ECR Image Update
```bash
# List images in ECR repository
aws ecr describe-images --repository-name nt114-devsecops/frontend --region us-east-1

# Check if latest tag has new timestamp
aws ecr describe-images --repository-name nt114-devsecops/frontend --image-ids imageTag=latest --region us-east-1
```

### Check Pod Health After New Image
```bash
# Watch pod status
kubectl get pods -n dev -w | grep frontend

# Check pod logs to verify entrypoint script execution
kubectl logs -n dev deployment/frontend --tail=50

# Should see: "Configuring nginx with API Gateway URL: http://..."
```

### Check ArgoCD Application Health
```bash
# Check application status
kubectl get applications -n argocd

# Should show:
# frontend    Synced    Healthy
```

## Current Status

**Pods:**
- `frontend-6c9d6cb44d-4hwhf` - Running (old stable image)
- `frontend-6c9d6cb44d-kcp2n` - Running (old stable image)

**ArgoCD:**
- Auto-sync: DISABLED (temporarily)
- Sync Status: Synced
- Health Status: Progressing (expected until new image deployed)

**GitHub Actions:**
- Workflow: frontend-build.yml
- Status: Running (triggered by commit e418fdf)
- ETA: 5-8 minutes

## Post-Deployment Verification

Once new image is deployed, verify:

1. **Frontend accessible via LoadBalancer**
   ```bash
   kubectl get svc frontend -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
   ```

2. **API proxy working**
   ```bash
   # Test API call through frontend nginx
   curl -X POST http://<frontend-lb>/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Environment variable injection**
   ```bash
   # Check nginx.conf has actual URL not placeholder
   kubectl exec -n dev deployment/frontend -- cat /etc/nginx/nginx.conf | grep proxy_pass
   # Should show: proxy_pass http://aafb5d739a4bf435eb9e836f1391d91b-1580858419.us-east-1.elb.amazonaws.com:8080;
   ```

## References

- Commit with entrypoint changes: 57f323a
- Rebuild trigger commit: e418fdf
- Frontend build workflow: `.github/workflows/frontend-build.yml`
- Dynamic API URL documentation: `docs/dynamic-api-url-configuration.md`
- ArgoCD README: `argocd/README.md`
