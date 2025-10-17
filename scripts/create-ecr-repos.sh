#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}====================================="
echo "Creating ECR Repositories"
echo -e "=====================================${NC}\n"

# Get AWS region
AWS_REGION=${AWS_REGION:-us-east-1}
read -p "Enter AWS region (default: us-east-1): " input_region
if [ ! -z "$input_region" ]; then
    AWS_REGION="$input_region"
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials are not configured${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "AWS Account ID: ${GREEN}$AWS_ACCOUNT_ID${NC}"
echo -e "AWS Region: ${GREEN}$AWS_REGION${NC}\n"

# List of services
SERVICES=(
    "frontend"
    "api-gateway"
    "user-management-service"
    "exercises-service"
    "scores-service"
)

echo "Creating ECR repositories..."
echo ""

for service in "${SERVICES[@]}"; do
    echo -n "Creating repository for $service... "

    # Check if repository already exists
    if aws ecr describe-repositories --repository-names "$service" --region "$AWS_REGION" &> /dev/null; then
        echo -e "${YELLOW}Already exists${NC}"
    else
        # Create repository
        aws ecr create-repository \
            --repository-name "$service" \
            --region "$AWS_REGION" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256 \
            > /dev/null 2>&1

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Created${NC}"

            # Set lifecycle policy to keep only last 10 images
            aws ecr put-lifecycle-policy \
                --repository-name "$service" \
                --region "$AWS_REGION" \
                --lifecycle-policy-text '{
                    "rules": [{
                        "rulePriority": 1,
                        "description": "Keep last 10 images",
                        "selection": {
                            "tagStatus": "any",
                            "countType": "imageCountMoreThan",
                            "countNumber": 10
                        },
                        "action": {
                            "type": "expire"
                        }
                    }]
                }' > /dev/null 2>&1
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
    fi
done

echo ""
echo -e "${GREEN}====================================="
echo "ECR Repositories Created!"
echo -e "=====================================${NC}\n"

echo "Repository URLs:"
for service in "${SERVICES[@]}"; do
    echo "  $service: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/$service"
done

echo ""
echo "Next steps:"
echo "1. Login to ECR:"
echo "   aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo ""
echo "2. Build and push images using:"
echo "   ./scripts/build-and-push.sh"
echo ""
