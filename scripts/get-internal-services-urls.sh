#!/bin/bash
# Script to get Internal Services (ArgoCD & Grafana) access information
# These services share a single internal ALB using host-based routing

set -e

echo "=========================================="
echo "  Internal Services Access Info"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get ArgoCD info
echo -e "${GREEN}ArgoCD:${NC}"
ARGOCD_INGRESS=$(kubectl get ingress argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
if [ -n "$ARGOCD_INGRESS" ]; then
    ALB_DNS="$ARGOCD_INGRESS"
    echo "  Host: argocd.internal.local"
    echo "  ALB:  $ALB_DNS"
    echo "  Username: admin"
    ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>/dev/null | base64 -d || echo "N/A")
    echo "  Password: $ARGOCD_PASSWORD"
else
    echo "  Status: Ingress not ready yet"
fi
echo ""

# Get Grafana info
echo -e "${GREEN}Grafana:${NC}"

# Try different possible ingress names
GRAFANA_INGRESS=""
for name in "monitoring-grafana" "kube-prometheus-stack-grafana" "grafana"; do
    INGRESS_DNS=$(kubectl get ingress "$name" -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    if [ -n "$INGRESS_DNS" ]; then
        GRAFANA_INGRESS="$INGRESS_DNS"
        echo "  Found ingress: $name"
        break
    fi
done

if [ -n "$GRAFANA_INGRESS" ]; then
    ALB_DNS="$GRAFANA_INGRESS"
    echo "  Host: grafana.internal.local"
    echo "  ALB:  $ALB_DNS"
    echo "  Username: admin"
    GRAFANA_PASSWORD=$(kubectl get secret grafana-admin-credentials -n monitoring -o jsonpath="{.data.admin-password}" 2>/dev/null | base64 -d || echo "N/A")
    echo "  Password: $GRAFANA_PASSWORD"
else
    echo "  Status: Ingress not ready yet"
    echo "  Checking pods..."
    kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana 2>/dev/null || echo "  No Grafana pods found"
fi
echo ""

# Verify they share the same ALB
echo -e "${GREEN}ALB Information:${NC}"
if [ -n "$ALB_DNS" ]; then
    ALB_IP=$(dig +short "$ALB_DNS" 2>/dev/null | head -n1 || echo "")
    if [ -n "$ALB_IP" ]; then
        echo "  Shared ALB DNS: $ALB_DNS"
        echo "  Shared ALB IP:  $ALB_IP"
        echo ""
        echo -e "${YELLOW}Add to /etc/hosts (or C:\\Windows\\System32\\drivers\\etc\\hosts):${NC}"
        echo "  $ALB_IP  argocd.internal.local"
        echo "  $ALB_IP  grafana.internal.local"
    else
        echo "  ALB DNS: $ALB_DNS"
        echo "  IP: Resolving..."
    fi
else
    echo "  Status: ALB not provisioned yet"
    echo "  Check ingress status:"
    kubectl get ingress -n argocd -n monitoring 2>/dev/null || echo "  No ingresses found"
fi
echo ""

# Check if both ingresses use the same ALB group
echo -e "${GREEN}Verify ALB Group (should be 'internal-services'):${NC}"
ARGOCD_GROUP=$(kubectl get ingress argocd-server -n argocd -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/group\.name}' 2>/dev/null || echo "N/A")
echo "  ArgoCD group: $ARGOCD_GROUP"

# Try to find Grafana ingress
for name in "monitoring-grafana" "kube-prometheus-stack-grafana" "grafana"; do
    GRAFANA_GROUP=$(kubectl get ingress "$name" -n monitoring -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/group\.name}' 2>/dev/null || echo "")
    if [ -n "$GRAFANA_GROUP" ]; then
        echo "  Grafana group: $GRAFANA_GROUP (ingress: $name)"
        break
    fi
done

if [ -z "$GRAFANA_GROUP" ]; then
    echo "  Grafana group: Not found (ingress may not be created yet)"
fi

if [ "$ARGOCD_GROUP" = "$GRAFANA_GROUP" ] && [ "$ARGOCD_GROUP" != "N/A" ]; then
    echo -e "  ${GREEN}✓ Both services share the same ALB group${NC}"
else
    echo -e "  ${YELLOW}⚠ Warning: Services may not be sharing the same ALB${NC}"
fi
echo ""

echo "=========================================="
echo "For detailed access instructions, see:"
echo "  docs/internal-services-access.md"
echo "=========================================="
