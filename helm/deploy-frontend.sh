#!/bin/bash
set -e

# Script to deploy frontend with dynamic API Gateway URL
# Usage: ./deploy-frontend.sh [namespace]

NAMESPACE="${1:-dev}"

echo "🔍 Getting API Gateway LoadBalancer URL..."
API_URL=$(kubectl get svc api-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if [ -z "$API_URL" ]; then
  echo "❌ Error: Could not get API Gateway LoadBalancer URL"
  echo "   Make sure api-gateway service is deployed with type LoadBalancer"
  exit 1
fi

API_GATEWAY_URL="http://${API_URL}:8080"
echo "✅ API Gateway URL: $API_GATEWAY_URL"

echo "📦 Deploying frontend to namespace: $NAMESPACE"
helm upgrade --install frontend ./frontend \
  -f ./frontend/values-eks.yaml \
  -n "$NAMESPACE" \
  --set env[1].value="$API_GATEWAY_URL" \
  --disable-openapi-validation

echo "✅ Frontend deployed successfully!"
echo "🌐 Get frontend URL with:"
echo "   kubectl get svc frontend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"
