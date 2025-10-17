#!/bin/bash

set -e

echo "====================================="
echo "Installing ArgoCD on EKS Cluster"
echo "====================================="

# Create argocd namespace
echo "Creating argocd namespace..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# Install ArgoCD
echo "Installing ArgoCD..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Patch ArgoCD server to use LoadBalancer (for ALB)
echo "Patching ArgoCD server service..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Get initial admin password
echo ""
echo "====================================="
echo "ArgoCD Installation Complete!"
echo "====================================="
echo ""
echo "Getting ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD Admin Password: $ARGOCD_PASSWORD"
echo ""

# Wait for LoadBalancer to be ready
echo "Waiting for LoadBalancer to be ready..."
sleep 10

# Get ArgoCD server URL
ARGOCD_URL=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "ArgoCD URL: https://$ARGOCD_URL"
echo ""
echo "Login with:"
echo "  Username: admin"
echo "  Password: $ARGOCD_PASSWORD"
echo ""

# Install ArgoCD CLI (optional)
echo "To install ArgoCD CLI, run:"
echo "  curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64"
echo "  chmod +x /usr/local/bin/argocd"
echo ""

echo "====================================="
echo "Next Steps:"
echo "====================================="
echo "1. Login to ArgoCD UI using the credentials above"
echo "2. Apply the project configuration:"
echo "   kubectl apply -f argocd/projects/nt114-devsecops.yaml"
echo "3. Deploy applications:"
echo "   kubectl apply -f argocd/applications/"
echo ""
