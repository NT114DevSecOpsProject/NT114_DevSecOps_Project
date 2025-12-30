#!/bin/bash
echo "=================================="
echo "🎯 CHECKING DEPLOYMENT ACCESS URLs"
echo "=================================="
echo ""

# Get Frontend URL
echo "📱 Frontend Application:"
FRONTEND_URL=$(kubectl get service frontend-dev -n dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
if [ -z "$FRONTEND_URL" ]; then
  echo "  ❌ Frontend LoadBalancer not found"
else
  echo "  ✅ URL: http://$FRONTEND_URL"
fi
echo ""

# Get ArgoCD URL
echo "🔐 ArgoCD Dashboard:"
ARGOCD_URL=$(kubectl get service argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
if [ -z "$ARGOCD_URL" ]; then
  echo "  ❌ ArgoCD LoadBalancer not found"
else
  echo "  ✅ URL: http://$ARGOCD_URL"
  
  # Get ArgoCD password
  ARGOCD_PASSWORD=$(kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' 2>/dev/null | base64 -d)
  if [ -z "$ARGOCD_PASSWORD" ]; then
    echo "  ⚠️  Password: (secret not found)"
  else
    echo "  ✅ Username: admin"
    echo "  ✅ Password: $ARGOCD_PASSWORD"
  fi
fi
echo ""

# Check pod health
echo "🏥 Pod Health Status:"
TOTAL_PODS=$(kubectl get pods -n dev --no-headers 2>/dev/null | wc -l)
READY_PODS=$(kubectl get pods -n dev --no-headers 2>/dev/null | grep "1/1.*Running" | wc -l)
echo "  Total: $TOTAL_PODS pods"
echo "  Ready: $READY_PODS pods"
if [ "$READY_PODS" -ge 8 ]; then
  echo "  ✅ All critical pods are healthy!"
else
  echo "  ⚠️  Some pods may not be ready"
fi
echo ""

echo "=================================="
echo "✅ ONE-CLICK DEPLOYMENT STATUS"
echo "=================================="
if [ ! -z "$FRONTEND_URL" ] && [ ! -z "$ARGOCD_URL" ] && [ "$READY_PODS" -ge 8 ]; then
  echo "🎉 SUCCESS! All systems operational."
  echo ""
  echo "👉 Access your app at: http://$FRONTEND_URL"
  echo "👉 Manage via ArgoCD: http://$ARGOCD_URL"
else
  echo "⚠️  Deployment partially complete. Check errors above."
fi
echo "=================================="
