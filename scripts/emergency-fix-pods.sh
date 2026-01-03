#!/bin/bash
# Emergency script to fix pod deployment issues
# Run this directly on a machine with kubectl access to the cluster

set -e

echo "🚨 Emergency Pod Fix Script"
echo "============================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="dev"
AWS_REGION="us-east-1"
ECR_REGISTRY="039612870452.dkr.ecr.us-east-1.amazonaws.com"

echo "📋 Step 1: Check cluster connectivity"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to cluster. Please configure kubectl first.${NC}"
    echo "Run: aws eks update-kubeconfig --region us-east-1 --name eks-1"
    exit 1
fi
echo -e "${GREEN}✅ Connected to cluster${NC}"
echo ""

echo "📋 Step 2: Check current pod status"
kubectl get pods -n $NAMESPACE
echo ""

echo "📋 Step 3: Check nodes"
kubectl get nodes -o wide
echo ""
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
echo "Total nodes: $NODE_COUNT"
echo ""

echo "📋 Step 4: Check/Create ECR secret"
if kubectl get secret ecr-secret -n $NAMESPACE &> /dev/null; then
    echo -e "${YELLOW}⚠️ ECR secret exists, recreating with fresh token...${NC}"
    kubectl delete secret ecr-secret -n $NAMESPACE
fi

echo "Getting ECR login token..."
ECR_PASSWORD=$(aws ecr get-login-password --region $AWS_REGION)

echo "Creating ECR secret..."
kubectl create secret docker-registry ecr-secret \
    --docker-server=$ECR_REGISTRY \
    --docker-username=AWS \
    --docker-password="$ECR_PASSWORD" \
    -n $NAMESPACE

echo -e "${GREEN}✅ ECR secret created${NC}"
kubectl get secret ecr-secret -n $NAMESPACE
echo ""

echo "📋 Step 5: Check for pending pods and their events"
PENDING_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l)
echo "Pending pods: $PENDING_PODS"

if [ "$PENDING_PODS" -gt 0 ]; then
    echo ""
    echo "Checking why pods are pending..."
    FIRST_PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | head -1 | awk '{print $1}')
    if [ -n "$FIRST_PENDING" ]; then
        echo "Events for $FIRST_PENDING:"
        kubectl describe pod $FIRST_PENDING -n $NAMESPACE | grep -A20 "Events:"
    fi
fi
echo ""

echo "📋 Step 6: Check node resources"
kubectl top nodes || echo "⚠️ Metrics server not ready yet"
echo ""

echo "📋 Step 7: Delete old failed pods to trigger recreation"
echo "Deleting ImagePullBackOff pods..."
kubectl delete pods -n $NAMESPACE --field-selector=status.phase=Failed 2>/dev/null || true
kubectl get pods -n $NAMESPACE | grep ImagePullBackOff | awk '{print $1}' | xargs -r kubectl delete pod -n $NAMESPACE || true
kubectl get pods -n $NAMESPACE | grep ErrImagePull | awk '{print $1}' | xargs -r kubectl delete pod -n $NAMESPACE || true

echo -e "${GREEN}✅ Cleaned up failed pods${NC}"
echo ""

echo "📋 Step 8: Force restart all deployments"
echo "This will trigger fresh pod creation with ECR secret..."
for deployment in $(kubectl get deployments -n $NAMESPACE -o name); do
    echo "Restarting $deployment..."
    kubectl rollout restart $deployment -n $NAMESPACE
done

echo -e "${GREEN}✅ All deployments restarted${NC}"
echo ""

echo "📋 Step 9: Wait for pods to start (60 seconds)"
echo "Monitoring pod status..."
for i in {1..12}; do
    echo "Check $i/12:"
    RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    echo "  Running: $RUNNING/$TOTAL"

    if [ "$RUNNING" -ge 8 ]; then
        echo -e "${GREEN}✅ Most pods are running!${NC}"
        break
    fi

    sleep 5
done
echo ""

echo "📋 Step 10: Final status"
echo "=================="
kubectl get pods -n $NAMESPACE
echo ""

echo "📋 ArgoCD Applications:"
kubectl get applications -n argocd
echo ""

echo "📋 Check for any remaining issues:"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | grep Warning | tail -10
echo ""

RUNNING_COUNT=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
TOTAL_COUNT=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)

if [ "$RUNNING_COUNT" -ge 8 ]; then
    echo -e "${GREEN}🎉 SUCCESS! $RUNNING_COUNT/$TOTAL_COUNT pods are running!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ Only $RUNNING_COUNT/$TOTAL_COUNT pods running. Check events above for issues.${NC}"
    echo ""
    echo "Common issues to check:"
    echo "1. Node capacity: kubectl describe nodes"
    echo "2. Resource requests: kubectl describe pods -n $NAMESPACE | grep -A5 'Requests:'"
    echo "3. Node selectors/tolerations: kubectl get pods -n $NAMESPACE -o yaml | grep -A5 'nodeSelector\\|tolerations'"
    exit 1
fi
