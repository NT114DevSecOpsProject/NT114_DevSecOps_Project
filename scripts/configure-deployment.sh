#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================="
echo "NT114 DevSecOps Deployment Configuration"
echo -e "=====================================${NC}\n"

# Function to get AWS account ID
get_aws_account_id() {
    if command -v aws &> /dev/null; then
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Detected AWS Account ID: $AWS_ACCOUNT_ID${NC}"
            return 0
        fi
    fi
    return 1
}

# Try to get AWS account ID automatically
if get_aws_account_id; then
    read -p "Use this AWS Account ID? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        AWS_ACCOUNT_ID=""
    fi
fi

# If not detected or user declined, ask for manual input
if [ -z "$AWS_ACCOUNT_ID" ]; then
    read -p "Enter your AWS Account ID: " AWS_ACCOUNT_ID
fi

# Validate AWS Account ID (12 digits)
if ! [[ "$AWS_ACCOUNT_ID" =~ ^[0-9]{12}$ ]]; then
    echo -e "${RED}✗ Invalid AWS Account ID. Must be 12 digits.${NC}"
    exit 1
fi

# Get AWS region
AWS_REGION="us-east-1"
read -p "Enter AWS region (default: us-east-1): " input_region
if [ ! -z "$input_region" ]; then
    AWS_REGION="$input_region"
fi

echo -e "\n${YELLOW}Configuration:${NC}"
echo "  AWS Account ID: $AWS_ACCOUNT_ID"
echo "  AWS Region: $AWS_REGION"
echo "  GitHub Repo: https://github.com/conghieu2004/NT114_DevSecOps_Project.git"
echo ""

read -p "Proceed with configuration update? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Configuration cancelled.${NC}"
    exit 0
fi

echo -e "\n${GREEN}Updating configuration files...${NC}\n"

# Update Helm values.yaml files
echo "Updating Helm charts..."
for service in frontend api-gateway user-management-service exercises-service scores-service; do
    values_file="helm/$service/values.yaml"
    if [ -f "$values_file" ]; then
        sed -i "s|<AWS_ACCOUNT_ID>|$AWS_ACCOUNT_ID|g" "$values_file"
        sed -i "s|us-east-1|$AWS_REGION|g" "$values_file"
        echo -e "  ${GREEN}✓${NC} Updated $values_file"
    fi
done

# Update ArgoCD application manifests
echo -e "\nUpdating ArgoCD applications..."
for app_file in argocd/applications/*.yaml; do
    if [ -f "$app_file" ]; then
        sed -i "s|<AWS_ACCOUNT_ID>|$AWS_ACCOUNT_ID|g" "$app_file"
        sed -i "s|us-east-1|$AWS_REGION|g" "$app_file"
        echo -e "  ${GREEN}✓${NC} Updated $(basename $app_file)"
    fi
done

# Update Terraform configuration if needed
if [ -f "terraform/environments/dev/terraform.tfvars" ]; then
    echo -e "\nUpdating Terraform configuration..."
    if ! grep -q "aws_region" terraform/environments/dev/terraform.tfvars; then
        echo "aws_region = \"$AWS_REGION\"" >> terraform/environments/dev/terraform.tfvars
        echo -e "  ${GREEN}✓${NC} Added aws_region to terraform.tfvars"
    else
        sed -i "s|aws_region.*=.*|aws_region = \"$AWS_REGION\"|g" terraform/environments/dev/terraform.tfvars
        echo -e "  ${GREEN}✓${NC} Updated aws_region in terraform.tfvars"
    fi
fi

echo -e "\n${GREEN}====================================="
echo "Configuration Update Complete!"
echo -e "=====================================${NC}\n"

echo "Next steps:"
echo "1. Review the updated configuration files"
echo "2. Create ECR repositories:"
echo "   ./scripts/create-ecr-repos.sh"
echo "3. Build and push Docker images"
echo "4. Deploy infrastructure with Terraform"
echo "5. Deploy applications with ArgoCD"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"
echo ""
