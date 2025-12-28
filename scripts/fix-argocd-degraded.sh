#!/bin/bash
# Quick fix script for ArgoCD degraded applications
# This script creates the missing ECR secret in prod namespace

set -e

echo "🔧 Fixing ArgoCD Degraded Applications"
echo "========================================"
echo ""

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Error: kubectl is not configured or cluster is not accessible"
    echo "Run: aws eks update-kubeconfig --region us-east-1 --name eks-prod"
    exit 1
fi

# Get AWS account ID
echo "📊 Getting AWS account information..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "✅ AWS Account ID: $AWS_ACCOUNT_ID"
echo "✅ ECR Registry: $ECR_REGISTRY"
echo ""

# Check if prod namespace exists
echo "📦 Checking prod namespace..."
if ! kubectl get namespace prod &> /dev/null; then
    echo "❌ Error: prod namespace does not exist"
    echo "Creating prod namespace..."
    kubectl create namespace prod
fi
echo "✅ Namespace prod exists"
echo ""

# Get ECR login password
echo "🔑 Getting ECR credentials..."
ECR_PASSWORD=$(aws ecr get-login-password --region $AWS_REGION)
if [ -z "$ECR_PASSWORD" ]; then
    echo "❌ Error: Failed to get ECR password"
    exit 1
fi
echo "✅ ECR credentials obtained"
echo ""

# Create ECR secret
echo "🔐 Creating ECR docker-registry secret..."
kubectl create secret docker-registry ecr-secret \
  --docker-server=$ECR_REGISTRY \
  --docker-username=AWS \
  --docker-password=$ECR_PASSWORD \
  --namespace=prod \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ ECR secret created/updated"
echo ""

# Verify secret
echo "🔍 Verifying secret..."
if kubectl get secret ecr-secret -n prod &> /dev/null; then
    echo "✅ Secret ecr-secret exists in prod namespace"
else
    echo "❌ Error: Failed to create secret"
    exit 1
fi
echo ""

# Restart all deployments to trigger new image pull
echo "🔄 Restarting all deployments in prod namespace..."
DEPLOYMENTS=$(kubectl get deployments -n prod -o name 2>/dev/null || echo "")

if [ -z "$DEPLOYMENTS" ]; then
    echo "⚠️  Warning: No deployments found in prod namespace"
    echo "   This is expected if ArgoCD hasn't created them yet"
    echo "   Re-run this script after ArgoCD creates the deployments"
else
    kubectl rollout restart deployment -n prod --all
    echo "✅ All deployments restarted"
    echo ""

    echo "⏳ Waiting for deployments to roll out..."
    sleep 5

    # Show pod status
    echo ""
    echo "📊 Current pod status:"
    kubectl get pods -n prod
fi

echo ""
echo "✅ Fix applied successfully!"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for pods to restart"
echo "2. Check pod status: kubectl get pods -n prod"
echo "3. Check ArgoCD apps: kubectl get applications -n argocd | grep prod"
echo "4. Expected: Pods should be Running (not ImagePullBackOff)"
echo "5. Expected: ArgoCD apps should be Healthy (not Degraded)"
echo ""
echo "If pods are still failing, check logs:"
echo "  kubectl logs -n prod deployment/<deployment-name>"
echo ""
