#!/bin/bash

set -e

echo "====================================="
echo "Deploying NT114 Applications to ArgoCD"
echo "====================================="

# Check if argocd namespace exists
if ! kubectl get namespace argocd &> /dev/null; then
    echo "Error: ArgoCD is not installed. Please run install-argocd.sh first."
    exit 1
fi

# Apply project configuration
echo "Creating ArgoCD project..."
kubectl apply -f argocd/projects/nt114-devsecops.yaml

# Wait a bit for project to be created
sleep 2

# Deploy all applications
echo "Deploying applications..."
kubectl apply -f argocd/applications/

echo ""
echo "====================================="
echo "Deployment Complete!"
echo "====================================="
echo ""
echo "Applications deployed:"
echo "  - frontend"
echo "  - api-gateway"
echo "  - user-management-service"
echo "  - exercises-service"
echo "  - scores-service"
echo ""
echo "Check application status:"
echo "  kubectl get applications -n argocd"
echo ""
echo "Or visit ArgoCD UI to monitor deployments"
echo ""
