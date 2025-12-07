#!/bin/bash
set -e

echo "=========================================="
echo "ArgoCD + Application Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update kubeconfig
echo -e "${YELLOW}[1/7] Updating kubeconfig for EKS cluster...${NC}"
aws eks update-kubeconfig --region us-east-1 --name eks-1
echo -e "${GREEN}✓ Kubeconfig updated${NC}"
echo ""

# Step 2: Create ArgoCD namespace
echo -e "${YELLOW}[2/7] Creating ArgoCD namespace...${NC}"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✓ Namespace created${NC}"
echo ""

# Step 3: Install ArgoCD
echo -e "${YELLOW}[3/7] Installing ArgoCD...${NC}"
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
echo -e "${GREEN}✓ ArgoCD installed${NC}"
echo ""

# Step 4: Wait for ArgoCD to be ready
echo -e "${YELLOW}[4/7] Waiting for ArgoCD pods to be ready (this may take 2-3 minutes)...${NC}"
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
echo -e "${GREEN}✓ ArgoCD is ready${NC}"
echo ""

# Step 5: Expose ArgoCD Server via LoadBalancer
echo -e "${YELLOW}[5/7] Exposing ArgoCD UI via LoadBalancer...${NC}"
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
echo "Waiting for LoadBalancer IP..."
sleep 30
echo -e "${GREEN}✓ ArgoCD UI exposed${NC}"
echo ""

# Step 6: Get ArgoCD admin password
echo -e "${YELLOW}[6/7] Getting ArgoCD admin credentials...${NC}"
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
ARGOCD_URL=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if [ -z "$ARGOCD_URL" ]; then
    ARGOCD_URL=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
fi

echo -e "${GREEN}✓ Credentials retrieved${NC}"
echo ""

# Step 7: Deploy existing applications via ArgoCD
echo -e "${YELLOW}[7/7] Deploying applications via ArgoCD...${NC}"

# Create ArgoCD application for frontend
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/phuocnguyen2412/NT114_DevSecOps_Project.git
    targetRevision: HEAD
    path: k8s/frontend
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
EOF

# Create ArgoCD application for backend services
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-auth
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/phuocnguyen2412/NT114_DevSecOps_Project.git
    targetRevision: HEAD
    path: k8s/auth-service
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
EOF

cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-scores
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/phuocnguyen2412/NT114_DevSecOps_Project.git
    targetRevision: HEAD
    path: k8s/scores-service
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
EOF

echo -e "${GREEN}✓ Applications deployed${NC}"
echo ""

# Get frontend URL
echo "Waiting for frontend LoadBalancer..."
sleep 20
FRONTEND_URL=$(kubectl get svc frontend-service -n default -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
if [ -z "$FRONTEND_URL" ]; then
    FRONTEND_URL=$(kubectl get svc frontend-service -n default -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending...")
fi

# Print summary
echo "=========================================="
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}ArgoCD UI Access:${NC}"
echo "  URL:      http://$ARGOCD_URL"
echo "  Username: admin"
echo "  Password: $ARGOCD_PASSWORD"
echo ""
echo -e "${YELLOW}Application Frontend:${NC}"
echo "  URL: http://$FRONTEND_URL"
echo ""
echo "To check application status:"
echo "  kubectl get applications -n argocd"
echo "  kubectl get pods -n default"
echo ""
echo "Note: It may take a few minutes for LoadBalancers to become fully available."
echo "=========================================="
