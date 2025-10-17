# Helm Charts - NT114 DevSecOps Project

This directory contains Helm charts for deploying the NT114 DevSecOps application microservices on Kubernetes.

## Directory Structure

```
helm/
├── frontend/                    # Frontend React application
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── api-gateway/                 # API Gateway service
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── user-management-service/     # User management microservice
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── exercises-service/           # Exercises microservice
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
└── scores-service/              # Scores microservice
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
```

## Chart Overview

### Frontend
- **Description**: React application built with Vite
- **Port**: 80
- **Ingress**: Enabled (internet-facing ALB)
- **Scaling**: HPA enabled (2-10 replicas)

### API Gateway
- **Description**: Main API gateway for routing requests
- **Port**: 8080
- **Ingress**: Enabled (internet-facing ALB)
- **Scaling**: HPA enabled (2-10 replicas)

### Microservices
- **User Management Service**: Port 8081
- **Exercises Service**: Port 8082
- **Scores Service**: Port 8083
- **Ingress**: Disabled (internal services)
- **Scaling**: HPA enabled (2-5 replicas each)

## Prerequisites

1. **Kubernetes Cluster**: Running EKS cluster (v1.31+)
2. **Helm**: Version 3.x installed
3. **kubectl**: Configured to access your cluster
4. **AWS Load Balancer Controller**: Installed on the cluster
5. **Docker Images**: Built and pushed to ECR

## Configuration

### Image Repository

Before deploying, update the image repository in each chart's `values.yaml`:

```yaml
image:
  repository: <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/<SERVICE_NAME>
  tag: latest
```

Replace `<AWS_ACCOUNT_ID>` with your AWS account ID.

### Environment Variables

Each service has environment variables configured in `values.yaml`:

**Frontend:**
```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: API_GATEWAY_URL
    value: "http://api-gateway:8080"
```

**API Gateway:**
```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: USER_SERVICE_URL
    value: "http://user-management-service:8081"
  - name: EXERCISES_SERVICE_URL
    value: "http://exercises-service:8082"
  - name: SCORES_SERVICE_URL
    value: "http://scores-service:8083"
```

### Ingress Configuration

The frontend and API gateway have ALB ingress enabled:

```yaml
ingress:
  enabled: true
  className: "alb"
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /health
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix
```

Update the `host` value with your domain.

## Deployment Methods

### Method 1: Manual Helm Installation

#### Install a Single Chart

```bash
# Install frontend
helm install frontend ./helm/frontend

# Install with custom values
helm install frontend ./helm/frontend -f custom-values.yaml

# Install in specific namespace
helm install frontend ./helm/frontend -n production --create-namespace
```

#### Install All Charts

```bash
# Install all services
for chart in frontend api-gateway user-management-service exercises-service scores-service; do
  helm install $chart ./helm/$chart
done
```

#### Upgrade a Release

```bash
helm upgrade frontend ./helm/frontend

# Upgrade with new image tag
helm upgrade frontend ./helm/frontend --set image.tag=v1.2.3
```

#### Uninstall a Release

```bash
helm uninstall frontend
```

### Method 2: ArgoCD (Recommended)

ArgoCD provides GitOps-based continuous deployment. See the [ArgoCD README](../argocd/README.md) for details.

## Resource Configuration

### CPU and Memory

Default resource limits for each service:

**Frontend & Microservices:**
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

**API Gateway:**
```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
```

### Auto-Scaling

Horizontal Pod Autoscaler (HPA) is enabled for all services:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80
```

## Health Checks

All services have liveness and readiness probes configured:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

Ensure your applications expose a `/health` endpoint.

## Testing

### Validate Charts

```bash
# Lint a chart
helm lint ./helm/frontend

# Dry-run installation
helm install frontend ./helm/frontend --dry-run --debug

# Template rendering
helm template frontend ./helm/frontend
```

### Verify Deployment

```bash
# Check pod status
kubectl get pods

# Check service status
kubectl get svc

# Check ingress
kubectl get ingress

# View logs
kubectl logs -l app.kubernetes.io/name=frontend

# Describe pod
kubectl describe pod <pod-name>
```

## Customization

### Override Values

Create a `custom-values.yaml` file:

```yaml
replicaCount: 3

image:
  tag: v2.0.0

resources:
  limits:
    cpu: 1000m
    memory: 1Gi

env:
  - name: CUSTOM_VAR
    value: "custom-value"
```

Install with custom values:

```bash
helm install frontend ./helm/frontend -f custom-values.yaml
```

### Command-Line Overrides

```bash
helm install frontend ./helm/frontend \
  --set replicaCount=3 \
  --set image.tag=v2.0.0 \
  --set ingress.hosts[0].host=myapp.example.com
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check previous logs if crashed
kubectl logs <pod-name> --previous
```

### Image Pull Errors

Ensure:
1. Image exists in ECR
2. EKS nodes have IAM role with ECR pull permissions
3. Image tag is correct

### Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress <ingress-name>

# Check ALB controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Verify ALB controller is installed
kubectl get deployment -n kube-system aws-load-balancer-controller
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints

# Port forward for testing
kubectl port-forward svc/frontend 8080:80

# Test from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -qO- http://frontend
```

## Best Practices

1. **Version Control**: Always specify image tags, avoid `latest`
2. **Resource Limits**: Set appropriate CPU/memory limits
3. **Health Checks**: Implement `/health` endpoints in all services
4. **Secrets Management**: Use Kubernetes Secrets or external secret managers
5. **Configuration**: Use ConfigMaps for configuration data
6. **Monitoring**: Add Prometheus metrics endpoints
7. **Logging**: Use structured logging (JSON format)
8. **Security**: Run containers as non-root user (already configured)

## CI/CD Integration

### Building Images

```bash
# Build Docker image
docker build -t frontend:v1.0.0 ./frontend

# Tag for ECR
docker tag frontend:v1.0.0 <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/frontend:v1.0.0

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/frontend:v1.0.0
```

### Automated Deployment

With ArgoCD, deployments are automated:
1. Push code changes to Git
2. Build and push Docker images
3. Update image tag in Git repository
4. ArgoCD automatically syncs and deploys

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [ArgoCD documentation](../argocd/README.md)
- Open an issue in the GitHub repository
