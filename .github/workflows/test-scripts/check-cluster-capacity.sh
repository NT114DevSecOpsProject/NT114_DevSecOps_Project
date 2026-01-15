#!/bin/bash
# Script to check EKS cluster capacity and resource usage

echo "=========================================="
echo "CLUSTER CAPACITY ANALYSIS"
echo "=========================================="
echo ""

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name eks-prod 2>/dev/null || true

echo "1. NODES OVERVIEW"
echo "===================="
echo ""
kubectl get nodes -o wide
echo ""

echo "2. NODES CAPACITY vs ALLOCATABLE"
echo "=================================="
echo ""
kubectl get nodes -o json | jq -r '.items[] |
  "\(.metadata.name):
    CPU Capacity:     \(.status.capacity.cpu) cores
    CPU Allocatable:  \(.status.allocatable.cpu) cores
    Memory Capacity:  \(.status.capacity.memory)
    Memory Allocatable: \(.status.allocatable.memory)
    Pods Capacity:    \(.status.capacity.pods)
    Pods Allocatable: \(.status.allocatable.pods)
  "'
echo ""

echo "3. RESOURCE USAGE PER NODE"
echo "============================"
echo ""
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== Node: $node ==="
  kubectl describe node $node | grep -A 5 "Allocated resources:"
  echo ""
done

echo "4. PODS PER NODE"
echo "================="
echo ""
echo "Node                              Total  Running  Pending  Failed"
echo "----------------------------------------------------------------"
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  TOTAL=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=$node --no-headers 2>/dev/null | wc -l)
  RUNNING=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=$node,status.phase=Running --no-headers 2>/dev/null | wc -l)
  PENDING=$(kubectl get pods --all-namespaces --field-selector status.phase=Pending --no-headers 2>/dev/null | grep $node | wc -l)
  FAILED=$(kubectl get pods --all-namespaces --field-selector status.phase=Failed --no-headers 2>/dev/null | grep $node | wc -l)
  printf "%-35s %-6s %-8s %-8s %-6s\n" "$node" "$TOTAL" "$RUNNING" "$PENDING" "$FAILED"
done
echo ""

echo "5. PENDING PODS (Resource Shortage Indicator)"
echo "=============================================="
echo ""
PENDING_COUNT=$(kubectl get pods --all-namespaces --field-selector status.phase=Pending --no-headers 2>/dev/null | wc -l)
if [ "$PENDING_COUNT" -gt 0 ]; then
  echo "⚠️  WARNING: $PENDING_COUNT pods are Pending"
  echo ""
  kubectl get pods --all-namespaces --field-selector status.phase=Pending -o wide
  echo ""
  echo "Pending Reasons:"
  kubectl get pods --all-namespaces --field-selector status.phase=Pending -o json | \
    jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): \(.status.conditions[]? | select(.type=="PodScheduled") | .message)"'
else
  echo "✅ No pending pods"
fi
echo ""

echo "6. RESOURCE REQUESTS vs LIMITS (Top 10 Consumers)"
echo "==================================================="
echo ""
echo "CPU Requests:"
kubectl top pods --all-namespaces --sort-by=cpu 2>/dev/null | head -11 || echo "Metrics not available yet"
echo ""
echo "Memory Requests:"
kubectl top pods --all-namespaces --sort-by=memory 2>/dev/null | head -11 || echo "Metrics not available yet"
echo ""

echo "7. CLUSTER AUTOSCALER STATUS"
echo "============================="
echo ""
if kubectl get deployment cluster-autoscaler -n kube-system &>/dev/null; then
  echo "Cluster Autoscaler: INSTALLED"
  kubectl get deployment cluster-autoscaler -n kube-system
  echo ""
  echo "Recent Autoscaler Logs:"
  kubectl logs -n kube-system -l app=cluster-autoscaler --tail=20 2>/dev/null || echo "No logs available"
else
  echo "⚠️  Cluster Autoscaler: NOT INSTALLED"
fi
echo ""

echo "8. NODE AUTOSCALING GROUPS (AWS)"
echo "=================================="
echo ""
aws autoscaling describe-auto-scaling-groups \
  --query "AutoScalingGroups[?contains(Tags[?Key=='kubernetes.io/cluster/eks-prod'].Value, 'owned')].{Name:AutoScalingGroupName, Desired:DesiredCapacity, Min:MinSize, Max:MaxSize, Current:Instances[0].LifecycleState}" \
  --output table 2>/dev/null || echo "Cannot fetch ASG info"
echo ""

echo "9. CAPACITY RECOMMENDATION"
echo "==========================="
echo ""

# Calculate total capacity
TOTAL_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
TOTAL_PODS=$(kubectl get pods --all-namespaces --no-headers 2>/dev/null | wc -l)
RUNNING_PODS=$(kubectl get pods --all-namespaces --field-selector status.phase=Running --no-headers 2>/dev/null | wc -l)
PENDING_PODS=$(kubectl get pods --all-namespaces --field-selector status.phase=Pending --no-headers 2>/dev/null | wc -l)

# Get CPU/Memory from first node (assuming homogeneous)
FIRST_NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
CPU_PER_NODE=$(kubectl get node $FIRST_NODE -o jsonpath='{.status.allocatable.cpu}')
MEM_PER_NODE=$(kubectl get node $FIRST_NODE -o jsonpath='{.status.allocatable.memory}')

echo "Current Cluster:"
echo "  - Nodes: $TOTAL_NODES"
echo "  - CPU per node: ~$CPU_PER_NODE cores"
echo "  - Memory per node: ~$MEM_PER_NODE"
echo "  - Total Pods: $TOTAL_PODS (Running: $RUNNING_PODS, Pending: $PENDING_PODS)"
echo ""

if [ "$PENDING_PODS" -gt 0 ]; then
  echo "⚠️  STATUS: CAPACITY EXHAUSTED"
  echo "  → $PENDING_PODS pods waiting for resources"
  echo "  → Cluster Autoscaler should scale up automatically"
  echo "  → Check ASG max size if scaling doesn't happen"
elif [ "$TOTAL_NODES" -lt 2 ]; then
  echo "⚠️  STATUS: MINIMAL CAPACITY"
  echo "  → Consider adding more nodes for high availability"
elif [ "$RUNNING_PODS" -gt $((TOTAL_NODES * 20)) ]; then
  echo "⚠️  STATUS: HIGH DENSITY"
  echo "  → Average >20 pods per node"
  echo "  → May need more nodes for better distribution"
else
  echo "✅ STATUS: HEALTHY CAPACITY"
  echo "  → Cluster has sufficient resources"
fi
echo ""

echo "=========================================="
echo "ANALYSIS COMPLETE"
echo "=========================================="
