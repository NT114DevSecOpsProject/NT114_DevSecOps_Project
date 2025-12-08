# Dynamic API URL Configuration

## Overview

Frontend nginx configuration now supports dynamic API Gateway URL through environment variables, eliminating the need to rebuild Docker images when API endpoints change.

## How It Works

### 1. **Docker Entrypoint Script**

File: `frontend/docker-entrypoint.sh`

- Runs when container starts
- Reads `API_GATEWAY_URL` environment variable
- Replaces placeholder `API_GATEWAY_URL_PLACEHOLDER` in nginx config with actual URL
- Then starts nginx

### 2. **Nginx Configuration**

File: `frontend/nginx.conf`

```nginx
location /auth {
    proxy_pass API_GATEWAY_URL_PLACEHOLDER;
    # ... other config
}
```

At runtime, this becomes:
```nginx
location /auth {
    proxy_pass http://your-api-gateway-url:8080;
}
```

### 3. **Dockerfile**

File: `frontend/Dockerfile.prod`

```dockerfile
# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/custom-entrypoint.sh
RUN chmod +x /usr/local/bin/custom-entrypoint.sh

# Set default API URL
ENV API_GATEWAY_URL=http://api-gateway:8080

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

## Usage

### Method 1: Update Helm Values

Edit `helm/frontend/values-eks.yaml`:

```yaml
env:
  - name: API_GATEWAY_URL
    value: "http://your-api-gateway-url:8080"
```

Then deploy:
```bash
cd helm
helm upgrade frontend ./frontend -f ./frontend/values-eks.yaml -n dev
```

### Method 2: Use Helm --set Flag

```bash
cd helm
helm upgrade frontend ./frontend \
  -f ./frontend/values-eks.yaml \
  -n dev \
  --set env[1].value="http://new-api-url:8080"
```

### Method 3: Use Deploy Helper Script (Recommended)

```bash
cd helm
chmod +x deploy-frontend.sh
./deploy-frontend.sh dev
```

This script automatically:
1. Gets API Gateway LoadBalancer URL from Kubernetes
2. Deploys frontend with correct API URL
3. No manual URL copy-paste needed!

### Method 4: Update Running Deployment

```bash
kubectl set env deployment/frontend \
  API_GATEWAY_URL="http://new-api-url:8080" \
  -n dev
```

## Get API Gateway URL

### Automatic (Used by deploy-frontend.sh)
```bash
kubectl get svc api-gateway -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Manual
```bash
kubectl get svc api-gateway -n dev
# Copy EXTERNAL-IP column
# Format: http://<EXTERNAL-IP>:8080
```

## Verification

### 1. Check Environment Variable in Pod
```bash
kubectl exec -it deployment/frontend -n dev -- env | grep API_GATEWAY_URL
```

### 2. Check Nginx Config
```bash
kubectl exec -it deployment/frontend -n dev -- cat /etc/nginx/conf.d/default.conf | grep proxy_pass
```

Should show actual URL, not placeholder.

### 3. Test API Proxy
```bash
# Get frontend URL
FRONTEND_URL=$(kubectl get svc frontend -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test auth endpoint (proxied to API Gateway)
curl http://$FRONTEND_URL/auth/health
```

## Benefits

✅ **No Image Rebuild**: Change API URL without rebuilding Docker image
✅ **Environment Flexibility**: Different API URLs per environment (dev/staging/prod)
✅ **GitOps Friendly**: Update URL via Helm values in Git
✅ **CI/CD Compatible**: GitHub Actions can inject dynamic URLs
✅ **Zero Downtime**: Rolling update when URL changes

## Troubleshooting

### Issue: Frontend returns 502 Bad Gateway

**Cause**: Incorrect API Gateway URL or API Gateway not accessible

**Solution**:
```bash
# 1. Check API Gateway service
kubectl get svc api-gateway -n dev

# 2. Test API Gateway directly
API_URL=$(kubectl get svc api-gateway -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$API_URL:8080/health

# 3. Check frontend env
kubectl exec deployment/frontend -n dev -- env | grep API_GATEWAY_URL

# 4. Update if needed
kubectl set env deployment/frontend API_GATEWAY_URL="http://$API_URL:8080" -n dev
```

### Issue: Placeholder still in nginx config

**Cause**: Entrypoint script didn't run or API_GATEWAY_URL not set

**Solution**:
```bash
# Check if env var exists
kubectl describe pod <frontend-pod> -n dev | grep API_GATEWAY_URL

# If missing, add it
kubectl set env deployment/frontend API_GATEWAY_URL="http://your-url:8080" -n dev
```

### Issue: Changes not taking effect

**Cause**: Old pods still running

**Solution**:
```bash
# Force pod restart
kubectl rollout restart deployment/frontend -n dev

# Wait for rollout
kubectl rollout status deployment/frontend -n dev
```

## Migration from Hardcoded URLs

### Before (Hardcoded)
```nginx
proxy_pass http://aafb5d739a4bf435eb9e836f1391d91b-1580858419.us-east-1.elb.amazonaws.com:8080;
```

**Problems**:
- Must rebuild image when API URL changes
- Different images per environment
- Manual updates required

### After (Dynamic)
```nginx
proxy_pass API_GATEWAY_URL_PLACEHOLDER;
```

**Benefits**:
- One image for all environments
- Configure at deployment time
- Automated URL discovery

## GitHub Actions Integration

Example workflow to deploy with dynamic URL:

```yaml
- name: Get API Gateway URL
  id: api-url
  run: |
    API_URL=$(kubectl get svc api-gateway -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    echo "url=http://${API_URL}:8080" >> $GITHUB_OUTPUT

- name: Deploy Frontend
  run: |
    helm upgrade frontend ./helm/frontend \
      -f ./helm/frontend/values-eks.yaml \
      -n dev \
      --set env[1].value="${{ steps.api-url.outputs.url }}"
```

## Related Files

- `frontend/docker-entrypoint.sh` - Entrypoint script
- `frontend/nginx.conf` - Nginx configuration with placeholder
- `frontend/Dockerfile.prod` - Dockerfile with entrypoint
- `helm/frontend/values-eks.yaml` - Helm values with API_GATEWAY_URL
- `helm/deploy-frontend.sh` - Helper deployment script
