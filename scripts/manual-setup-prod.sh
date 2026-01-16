#!/bin/bash
# Manual Setup Script for Production Environment
# This script sets up the complete infrastructure step by step
# Run this if GitHub Actions workflow fails

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="eks-prod"
ENVIRONMENT="prod"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Production Infrastructure Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print step headers
print_step() {
    echo ""
    echo -e "${GREEN}==> [$1] $2${NC}"
}

# Function to print warnings
print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Function to print errors
print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 0: Prerequisites check
print_step "0/10" "Checking prerequisites..."

if ! command_exists aws; then
    print_error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

if ! command_exists kubectl; then
    print_error "kubectl not found. Please install kubectl first."
    exit 1
fi

if ! command_exists helm; then
    print_error "helm not found. Please install helm first."
    exit 1
fi

if ! command_exists terraform; then
    print_error "terraform not found. Please install terraform first."
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"

# Step 1: Verify AWS credentials
print_step "1/10" "Verifying AWS credentials..."
aws sts get-caller-identity || {
    print_error "AWS credentials not configured"
    exit 1
}
echo -e "${GREEN}✓ AWS credentials verified${NC}"

# Step 2: Deploy Terraform infrastructure
print_step "2/10" "Deploying Terraform infrastructure..."
cd terraform/environments/prod

echo "Running terraform init..."
terraform init -upgrade

echo "Running terraform plan..."
terraform plan -out=tfplan

read -p "Review the plan above. Continue with apply? (yes/no): " -r
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    echo "Running terraform apply..."
    terraform apply tfplan
    echo -e "${GREEN}✓ Infrastructure deployed${NC}"
else
    print_error "Terraform apply cancelled by user"
    exit 1
fi

cd ../../..

# Step 3: Configure kubectl
print_step "3/10" "Configuring kubectl for EKS cluster..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
kubectl cluster-info
echo -e "${GREEN}✓ kubectl configured${NC}"

# Step 4: Wait for nodes to be ready
print_step "4/10" "Waiting for EKS nodes to be ready..."
echo "This may take 3-5 minutes..."

MAX_WAIT=600
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || echo "0")
    TOTAL_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")

    echo "[$ELAPSED s] Ready nodes: $READY_NODES/$TOTAL_NODES"

    if [ "$READY_NODES" -ge 2 ]; then
        echo -e "${GREEN}✓ $READY_NODES nodes are Ready${NC}"
        break
    fi

    sleep 15
    ELAPSED=$((ELAPSED + 15))
done

if [ "$READY_NODES" -lt 2 ]; then
    print_error "Timeout waiting for nodes to be Ready"
    exit 1
fi

# Step 5: Install Metrics Server
print_step "5/10" "Installing Metrics Server..."

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

sleep 5

kubectl patch deployment metrics-server -n kube-system --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--kubelet-insecure-tls"
  }
]'

kubectl wait --for=condition=available --timeout=180s deployment/metrics-server -n kube-system || {
    print_warning "Metrics Server not ready, but continuing..."
}
echo -e "${GREEN}✓ Metrics Server installed${NC}"

# Step 6: Install Cluster Autoscaler
print_step "6/10" "Installing Cluster Autoscaler..."

if ! kubectl get deployment cluster-autoscaler -n kube-system &>/dev/null; then
    curl -s https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml | \
    sed "s/<YOUR CLUSTER NAME>/$CLUSTER_NAME/g" | \
    kubectl apply -f -

    kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
      cluster-autoscaler.kubernetes.io/safe-to-evict="false" --overwrite

    kubectl -n kube-system set image deployment/cluster-autoscaler \
      cluster-autoscaler=registry.k8s.io/autoscaling/cluster-autoscaler:v1.33.0

    kubectl -n kube-system patch deployment cluster-autoscaler --type='json' -p='[
      {
        "op": "add",
        "path": "/spec/template/spec/tolerations",
        "value": [{"operator": "Exists"}]
      }
    ]'

    echo -e "${GREEN}✓ Cluster Autoscaler installed${NC}"
else
    echo -e "${GREEN}✓ Cluster Autoscaler already installed${NC}"
fi

# Step 7: Install AWS EBS CSI Driver
print_step "7/10" "Installing AWS EBS CSI Driver..."

if ! command_exists eksctl; then
    print_error "eksctl not found. Installing..."
    EKSCTL_VERSION="0.167.0"
    curl -sLO "https://github.com/weaveworks/eksctl/releases/download/v${EKSCTL_VERSION}/eksctl_Linux_amd64.tar.gz"
    tar -xzf eksctl_Linux_amd64.tar.gz
    sudo mv eksctl /usr/local/bin/
    rm eksctl_Linux_amd64.tar.gz
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICY_NAME="AmazonEBSCSIDriverPolicy-prod"

# Create policy if not exists
if ! aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}" &>/dev/null; then
    curl -o /tmp/ebs_csi_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/docs/example-iam-policy.json
    aws iam create-policy \
        --policy-name ${POLICY_NAME} \
        --policy-document file:///tmp/ebs_csi_policy.json
fi

# Create service account
if ! kubectl get serviceaccount ebs-csi-controller-sa -n kube-system &>/dev/null; then
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=ebs-csi-controller-sa \
        --role-name AmazonEKSEBSCSIDriverRole-prod \
        --attach-policy-arn=arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME} \
        --approve \
        --region $AWS_REGION
fi

# Install via Helm
if ! kubectl get deployment ebs-csi-controller -n kube-system &>/dev/null; then
    helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
    helm repo update

    helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
        --namespace kube-system \
        --set controller.serviceAccount.create=false \
        --set controller.serviceAccount.name=ebs-csi-controller-sa \
        --set controller.tolerations[0].operator=Exists \
        --set node.tolerations[0].operator=Exists \
        --wait \
        --timeout 5m
fi

echo -e "${GREEN}✓ EBS CSI Driver installed${NC}"

# Create gp3 StorageClass
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  fsType: ext4
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
EOF

# Step 8: Install AWS Load Balancer Controller
print_step "8/10" "Installing AWS Load Balancer Controller..."

POLICY_NAME="AWSLoadBalancerControllerIAMPolicy-prod"

# Create policy if not exists
if ! aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}" &>/dev/null; then
    curl -o /tmp/alb_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.0/docs/install/iam_policy.json
    aws iam create-policy \
        --policy-name ${POLICY_NAME} \
        --policy-document file:///tmp/alb_policy.json
fi

# Verify OIDC provider exists
OIDC_ISSUER=$(aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION --query "cluster.identity.oidc.issuer" --output text)
if [ -z "$OIDC_ISSUER" ]; then
    print_error "No OIDC provider found"
    eksctl utils associate-iam-oidc-provider --cluster $CLUSTER_NAME --region $AWS_REGION --approve
fi

# Create service account
if ! kubectl get serviceaccount aws-load-balancer-controller -n kube-system &>/dev/null; then
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --role-name AmazonEKSLoadBalancerControllerRole-prod \
        --attach-policy-arn=arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME} \
        --approve \
        --region $AWS_REGION
fi

# Get VPC ID
VPC_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION --query 'cluster.resourcesVpcConfig.vpcId' --output text)

# Install via Helm
if ! kubectl get deployment aws-load-balancer-controller -n kube-system &>/dev/null; then
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update

    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set vpcId=$VPC_ID \
        --set region=$AWS_REGION \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller \
        --set tolerations[0].operator=Exists \
        --wait \
        --timeout 10m
fi

echo -e "${GREEN}✓ AWS Load Balancer Controller installed${NC}"

# Step 9: Setup database secrets
print_step "9/10" "Setting up database secrets..."

kubectl create namespace prod --dry-run=client -o yaml | kubectl apply -f -

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier nt114-postgres-prod --region $AWS_REGION --query 'DBInstances[0].Endpoint.Address' --output text)

if [ -z "$RDS_ENDPOINT" ]; then
    print_error "RDS endpoint not found"
    exit 1
fi

echo "RDS Endpoint: $RDS_ENDPOINT"

# Create ECR secret
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

kubectl create secret docker-registry ecr-secret \
    --docker-server=$ECR_REGISTRY \
    --docker-username=AWS \
    --docker-password=$(aws ecr get-login-password --region $AWS_REGION) \
    --namespace=prod \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ Secrets configured${NC}"

# Step 10: Install ArgoCD
print_step "10/10" "Installing ArgoCD..."

kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

if ! kubectl get deployment argocd-server -n argocd &>/dev/null; then
    helm install argocd argo/argo-cd \
        --namespace argocd \
        -f helm/argocd/values-prod.yaml \
        --timeout 10m \
        --atomic
else
    echo -e "${GREEN}✓ ArgoCD already installed${NC}"
fi

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Get ArgoCD password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo -e "${GREEN}✓ ArgoCD installed${NC}"

# Final summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Region: $AWS_REGION"
echo ""
echo "ArgoCD Admin Password: $ARGOCD_PASSWORD"
echo ""
echo "Next steps:"
echo "1. Deploy applications via ArgoCD"
echo "2. Configure monitoring (Prometheus/Grafana)"
echo "3. Test application access"
echo ""
