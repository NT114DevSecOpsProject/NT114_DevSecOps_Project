#!/bin/bash
# Script to diagnose monitoring stack health issues

echo "=========================================="
echo "MONITORING HEALTH DIAGNOSTIC"
echo "=========================================="
echo ""

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name eks-prod 2>/dev/null || true

echo "1. Checking all monitoring pods status..."
echo "------------------------------------------"
kubectl get pods -n monitoring -o wide 2>/dev/null || echo "ERROR: Cannot get pods"
echo ""

echo "2. Checking pod status details (Not Running)..."
echo "------------------------------------------"
NOT_RUNNING=$(kubectl get pods -n monitoring --no-headers 2>/dev/null | grep -v "Running" || echo "")
if [ -n "$NOT_RUNNING" ]; then
    echo "$NOT_RUNNING"
    echo ""

    # Describe each non-running pod
    while IFS= read -r line; do
        POD_NAME=$(echo "$line" | awk '{print $1}')
        echo "--- Describing pod: $POD_NAME ---"
        kubectl describe pod "$POD_NAME" -n monitoring 2>/dev/null | tail -30
        echo ""
    done <<< "$NOT_RUNNING"
else
    echo "All pods are Running"
fi
echo ""

echo "3. Checking recent events in monitoring namespace..."
echo "------------------------------------------"
kubectl get events -n monitoring --sort-by='.lastTimestamp' 2>/dev/null | tail -20 || echo "ERROR: Cannot get events"
echo ""

echo "4. Checking PVC (Persistent Volume Claims) status..."
echo "------------------------------------------"
kubectl get pvc -n monitoring 2>/dev/null || echo "ERROR: Cannot get PVC"
echo ""

echo "5. Checking StorageClass 'gp3' availability..."
echo "------------------------------------------"
kubectl get storageclass gp3 2>/dev/null || echo "ERROR: StorageClass 'gp3' not found"
echo ""

echo "6. Checking node taints (for tolerations)..."
echo "------------------------------------------"
kubectl get nodes -o json 2>/dev/null | jq -r '.items[] | "\(.metadata.name): \(.spec.taints // [])"' || echo "ERROR: Cannot get node taints"
echo ""

echo "7. Checking grafana-admin-credentials secret..."
echo "------------------------------------------"
kubectl get secret grafana-admin-credentials -n monitoring 2>/dev/null || echo "ERROR: Secret not found"
echo ""

echo "8. Checking ArgoCD application sync status..."
echo "------------------------------------------"
kubectl get application monitoring -n argocd -o jsonpath='{.status}' 2>/dev/null | jq '.' || echo "ERROR: Cannot get application status"
echo ""

echo "9. Checking ingress status..."
echo "------------------------------------------"
kubectl get ingress -n monitoring 2>/dev/null || echo "ERROR: Cannot get ingress"
echo ""

echo "=========================================="
echo "DIAGNOSTIC COMPLETE"
echo "=========================================="
