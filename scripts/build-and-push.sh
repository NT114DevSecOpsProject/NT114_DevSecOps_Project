#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}====================================="
echo "Build and Push Docker Images"
echo -e "=====================================${NC}\n"

# Get AWS region and account ID
AWS_REGION=${AWS_REGION:-us-east-1}
read -p "Enter AWS region (default: us-east-1): " input_region
if [ ! -z "$input_region" ]; then
    AWS_REGION="$input_region"
fi

# Get AWS Account ID
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI is not installed${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to get AWS Account ID${NC}"
    exit 1
fi

# Image tag
IMAGE_TAG=${IMAGE_TAG:-latest}
read -p "Enter image tag (default: latest): " input_tag
if [ ! -z "$input_tag" ]; then
    IMAGE_TAG="$input_tag"
fi

echo -e "\nConfiguration:"
echo "  AWS Account ID: $AWS_ACCOUNT_ID"
echo "  AWS Region: $AWS_REGION"
echo "  Image Tag: $IMAGE_TAG"
echo ""

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to login to ECR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Logged in to ECR${NC}\n"

# Build and push frontend
echo -e "${YELLOW}Building frontend...${NC}"
if [ -f "frontend/Dockerfile" ]; then
    cd frontend
    docker build -t frontend:${IMAGE_TAG} .
    docker tag frontend:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/frontend:${IMAGE_TAG}
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/frontend:${IMAGE_TAG}
    echo -e "${GREEN}✓ Frontend pushed${NC}\n"
    cd ..
else
    echo -e "${RED}✗ frontend/Dockerfile not found${NC}\n"
fi

# Build and push microservices
cd microservices

SERVICES=("api-gateway" "user-management-service" "exercises-service" "scores-service")

for service in "${SERVICES[@]}"; do
    echo -e "${YELLOW}Building $service...${NC}"
    if [ -f "$service/Dockerfile" ]; then
        cd "$service"
        docker build -t ${service}:${IMAGE_TAG} .
        docker tag ${service}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${service}:${IMAGE_TAG}
        docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${service}:${IMAGE_TAG}
        echo -e "${GREEN}✓ $service pushed${NC}\n"
        cd ..
    else
        echo -e "${RED}✗ $service/Dockerfile not found${NC}\n"
    fi
done

cd ..

echo -e "${GREEN}====================================="
echo "All Images Built and Pushed!"
echo -e "=====================================${NC}\n"

echo "Images pushed:"
echo "  frontend:${IMAGE_TAG}"
for service in "${SERVICES[@]}"; do
    echo "  $service:${IMAGE_TAG}"
done

echo ""
echo "Next steps:"
echo "1. Deploy infrastructure with Terraform (if not done):"
echo "   cd terraform/environments/dev && terraform apply"
echo ""
echo "2. Install ArgoCD:"
echo "   cd argocd && ./install-argocd.sh"
echo ""
echo "3. Deploy applications:"
echo "   cd argocd && ./deploy-all.sh"
echo ""
