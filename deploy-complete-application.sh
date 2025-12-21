#!/bin/bash

###############################################################################
# Complete Application Deployment Script
#
# Purpose: Deploy full application with ArgoCD GitOps to EKS cluster
#
# Prerequisites:
#   - Terraform has created EKS cluster
#   - Docker images exist in ECR
#   - kubectl configured to EKS cluster
#   - AWS CLI configured
#
# Usage:
#   ./deploy-complete-application.sh [ENVIRONMENT]
#
#   ENVIRONMENT: dev (default) or prod
#
# Example:
#   ./deploy-complete-application.sh dev
#   ./deploy-complete-application.sh prod
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
AWS_REGION="us-east-1"
ECR_REGISTRY="039612870452.dkr.ecr.us-east-1.amazonaws.com"
ECR_ALIAS="nt114-devsecops"
ARGOCD_NAMESPACE="argocd"
APP_NAMESPACE="${ENVIRONMENT}"

# Services to deploy
SERVICES=(
    "api-gateway"
    "exercises-service"
    "scores-service"
    "user-management-service"
    "frontend"
)

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

step_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed or not in PATH"
        exit 1
    fi
}

###############################################################################
# Step 1: Validate Prerequisites
###############################################################################

validate_prerequisites() {
    step_header "Step 1: Validating Prerequisites"

    log_info "Checking required commands..."
    check_command kubectl
    check_command aws
    check_command curl
    log_success "All required commands available"

    log_info "Validating environment: $ENVIRONMENT"
    if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
        log_error "Invalid environment. Must be 'dev' or 'prod'"
        exit 1
    fi
    log_success "Environment validated: $ENVIRONMENT"

    log_info "Checking kubectl context..."
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Check kubectl configuration"
        exit 1
    fi
    log_success "Connected to Kubernetes cluster"

    log_info "Checking AWS credentials..."
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    CALLER_IDENTITY=$(aws sts get-caller-identity --query 'Arn' --output text)
    log_success "AWS authenticated as: $CALLER_IDENTITY"
}

###############################################################################
# Step 2: Get Terraform Outputs
###############################################################################

get_terraform_outputs() {
    step_header "Step 2: Retrieving Terraform Outputs"

    cd terraform/environments/${ENVIRONMENT}

    log_info "Getting RDS endpoint..."
    export DB_HOST=$(terraform output -raw db_host 2>/dev/null || echo "")
    export DB_PORT=$(terraform output -raw db_port 2>/dev/null || echo "5432")
    export DB_NAME=$(terraform output -raw db_name 2>/dev/null || echo "auth_db")
    export DB_USER=$(terraform output -raw db_username 2>/dev/null || echo "postgres")
    export DB_PASSWORD=$(terraform output -raw db_password 2>/dev/null || echo "")

    if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
        log_warn "Could not retrieve all database credentials from Terraform"
        log_info "You may need to create database secrets manually"
    else
        log_success "Database: $DB_HOST:$DB_PORT/$DB_NAME"
    fi

    cd ../../..
}

###############################################################################
# Step 3: Create Application Namespace
###############################################################################

create_namespace() {
    step_header "Step 3: Creating Application Namespace"

    log_info "Creating namespace: $APP_NAMESPACE"
    kubectl create namespace $APP_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    log_success "Namespace created: $APP_NAMESPACE"
}

###############################################################################
# Step 4: Create Kubernetes Secrets
###############################################################################

create_secrets() {
    step_header "Step 4: Creating Kubernetes Secrets"

    # ECR Secret
    log_info "Creating ECR pull secret..."
    kubectl create secret docker-registry ecr-secret \
        --docker-server=${ECR_REGISTRY} \
        --docker-username=AWS \
        --docker-password=$(aws ecr get-login-password --region ${AWS_REGION}) \
        --namespace=$APP_NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    log_success "ECR secret created"

    # Database Secret
    if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
        log_info "Creating database secret..."
        kubectl create secret generic user-management-db-secret \
            --from-literal=DB_HOST=$DB_HOST \
            --from-literal=DB_PORT=$DB_PORT \
            --from-literal=DB_NAME=$DB_NAME \
            --from-literal=DB_USER=$DB_USER \
            --from-literal=DB_PASSWORD=$DB_PASSWORD \
            --namespace=$APP_NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        log_success "Database secret created"
    else
        log_warn "Skipping database secret creation (credentials not available)"
    fi
}

###############################################################################
# Step 5: Install ArgoCD
###############################################################################

install_argocd() {
    step_header "Step 5: Installing ArgoCD"

    # Check if ArgoCD is already installed
    if kubectl get namespace $ARGOCD_NAMESPACE &> /dev/null; then
        log_info "ArgoCD namespace already exists"
    else
        log_info "Creating ArgoCD namespace..."
        kubectl create namespace $ARGOCD_NAMESPACE
        log_success "ArgoCD namespace created"
    fi

    # Install ArgoCD
    if kubectl get deployment argocd-server -n $ARGOCD_NAMESPACE &> /dev/null; then
        log_info "ArgoCD already installed"
    else
        log_info "Installing ArgoCD..."
        kubectl apply -n $ARGOCD_NAMESPACE -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

        log_info "Waiting for ArgoCD to be ready..."
        kubectl wait --for=condition=available --timeout=300s \
            deployment/argocd-server -n $ARGOCD_NAMESPACE
        log_success "ArgoCD installed successfully"
    fi

    # Patch ArgoCD server to use LoadBalancer
    log_info "Exposing ArgoCD server via LoadBalancer..."
    kubectl patch svc argocd-server -n $ARGOCD_NAMESPACE -p '{"spec": {"type": "LoadBalancer"}}'

    # Get ArgoCD admin password
    log_info "Retrieving ArgoCD admin password..."
    ARGOCD_PASSWORD=$(kubectl -n $ARGOCD_NAMESPACE get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>/dev/null | base64 -d || echo "123456")

    # Update ArgoCD admin password to 123456
    log_info "Setting ArgoCD admin password to: 123456"
    BCRYPT_HASH=$(kubectl -n dev exec deployment/user-management-service -- python -c "import bcrypt; print(bcrypt.hashpw(b'123456', bcrypt.gensalt(rounds=10)).decode())" 2>/dev/null || echo '$2b$10$oJkZ4g0P9V0OIEJ16Te2oOj/Y2cxvkptZTExA3W8FZ647JEojgm5i')

    kubectl -n argocd patch secret argocd-secret -p "{\"stringData\": {\"admin.password\": \"$BCRYPT_HASH\",\"admin.passwordMtime\": \"$(date -u +%FT%TZ)\"}}"
    kubectl -n argocd delete secret argocd-initial-admin-secret --ignore-not-found=true
    kubectl -n argocd rollout restart deployment argocd-server
    kubectl -n argocd rollout status deployment argocd-server --timeout=120s

    # Get ArgoCD URL
    log_info "Waiting for ArgoCD LoadBalancer URL..."
    sleep 30
    ARGOCD_URL=$(kubectl get svc argocd-server -n $ARGOCD_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")

    log_success "ArgoCD installed"
    echo ""
    log_info "ArgoCD Credentials:"
    echo "  URL: http://${ARGOCD_URL}"
    echo "  Username: admin"
    echo "  Password: 123456"
}

###############################################################################
# Step 6: Set Image Tags in Helm Values
###############################################################################

set_image_tags() {
    step_header "Step 6: Setting Image Tags in Helm Values"

    log_info "Using image tag: latest"
    IMAGE_TAG="latest"

    for service in "${SERVICES[@]}"; do
        VALUES_FILE="helm/${service}/values-${ENVIRONMENT}.yaml"

        if [ ! -f "$VALUES_FILE" ]; then
            log_warn "Values file not found: $VALUES_FILE"
            continue
        fi

        log_info "Updating $VALUES_FILE with tag: $IMAGE_TAG"

        # Update tag in values file
        sed -i.bak "s|tag: \".*\"|tag: \"$IMAGE_TAG\"|g" "$VALUES_FILE"
        rm -f "${VALUES_FILE}.bak"

        log_success "Updated $service image tag"
    done
}

###############################################################################
# Step 7: Deploy ArgoCD Applications
###############################################################################

deploy_argocd_applications() {
    step_header "Step 7: Deploying ArgoCD Applications"

    if [ "$ENVIRONMENT" == "dev" ]; then
        APP_DIR="argocd/applications"
    else
        APP_DIR="argocd/applications-prod"
    fi

    log_info "Deploying applications from: $APP_DIR"

    if [ ! -d "$APP_DIR" ]; then
        log_error "Application directory not found: $APP_DIR"
        exit 1
    fi

    kubectl apply -f $APP_DIR/ --validate=false
    log_success "ArgoCD applications deployed"

    # Wait for applications to sync
    log_info "Waiting for applications to sync (this may take 2-3 minutes)..."
    sleep 60

    # Force refresh all applications
    for service in "${SERVICES[@]}"; do
        APP_NAME="${service}"
        if [ "$ENVIRONMENT" == "prod" ]; then
            APP_NAME="${service}-prod"
        fi

        log_info "Refreshing $APP_NAME..."
        kubectl -n argocd patch application $APP_NAME \
            --type merge \
            -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}' \
            2>/dev/null || log_warn "Could not refresh $APP_NAME"
    done

    log_success "All applications deployed and refreshed"
}

###############################################################################
# Step 8: Initialize Database
###############################################################################

initialize_database() {
    step_header "Step 8: Initializing Database"

    if [ -z "$DB_HOST" ]; then
        log_warn "Skipping database initialization (no DB_HOST)"
        return
    fi

    log_info "Checking if init-db-job.yaml exists..."
    if [ -f "init-db-job.yaml" ]; then
        log_info "Applying database initialization job..."
        kubectl apply -f init-db-job.yaml

        log_info "Waiting for database initialization to complete..."
        kubectl wait --for=condition=complete --timeout=120s job/init-database -n $APP_NAMESPACE 2>/dev/null || log_warn "Database init job may still be running"

        log_success "Database initialized"
    else
        log_warn "init-db-job.yaml not found, skipping database initialization"
    fi
}

###############################################################################
# Step 9: Verify Deployment
###############################################################################

verify_deployment() {
    step_header "Step 9: Verifying Deployment"

    log_info "Checking pod status in namespace: $APP_NAMESPACE"
    kubectl get pods -n $APP_NAMESPACE

    echo ""
    log_info "Checking ArgoCD application status..."
    kubectl get applications -n $ARGOCD_NAMESPACE

    echo ""
    log_info "Getting service URLs..."

    # Frontend URL
    FRONTEND_URL=$(kubectl get svc frontend -n $APP_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    if [ "$FRONTEND_URL" != "pending" ]; then
        log_success "Frontend URL: http://$FRONTEND_URL"
    else
        log_info "Frontend LoadBalancer URL pending..."
    fi

    # API Gateway URL
    API_GW_URL=$(kubectl get svc api-gateway -n $APP_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    if [ "$API_GW_URL" != "pending" ]; then
        API_GW_PORT=$(kubectl get svc api-gateway -n $APP_NAMESPACE -o jsonpath='{.spec.ports[0].port}')
        log_success "API Gateway URL: http://$API_GW_URL:$API_GW_PORT"
    else
        log_info "API Gateway LoadBalancer URL pending..."
    fi
}

###############################################################################
# Step 10: Display Summary
###############################################################################

display_summary() {
    step_header "Deployment Complete! 🎉"

    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $APP_NAMESPACE"
    echo ""
    echo "Access URLs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    ARGOCD_URL=$(kubectl get svc argocd-server -n $ARGOCD_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    echo "ArgoCD:      http://$ARGOCD_URL"
    echo "  Username:  admin"
    echo "  Password:  123456"
    echo ""

    FRONTEND_URL=$(kubectl get svc frontend -n $APP_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    echo "Frontend:    http://$FRONTEND_URL"
    echo ""

    API_GW_URL=$(kubectl get svc api-gateway -n $APP_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    API_GW_PORT=$(kubectl get svc api-gateway -n $APP_NAMESPACE -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "8080")
    echo "API Gateway: http://$API_GW_URL:$API_GW_PORT"
    echo ""
    echo "Test Users:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  admin@example.com   / 123456 (Admin)"
    echo "  phuochv@example.com / 123456 (User)"
    echo ""
    echo "Next Steps:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Wait 2-3 minutes for all services to become ready"
    echo "2. Check pod status: kubectl get pods -n $APP_NAMESPACE"
    echo "3. Monitor deployments: kubectl get pods -n $APP_NAMESPACE -w"
    echo "4. View ArgoCD dashboard for sync status"
    echo "5. Test application endpoints"
    echo ""

    if [ "$ENVIRONMENT" == "dev" ]; then
        echo "GitOps Workflow (Dev):"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  Push code → GitHub Actions builds → Updates Git → ArgoCD syncs"
        echo "  Auto-sync: Enabled (changes deploy automatically)"
    else
        echo "GitOps Workflow (Prod):"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  Manual trigger in GitHub Actions → Approval required → Manual sync"
        echo "  Auto-sync: Disabled (manual approval required)"
    fi

    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║    Complete Application Deployment with ArgoCD GitOps        ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    validate_prerequisites
    get_terraform_outputs
    create_namespace
    create_secrets
    install_argocd
    set_image_tags
    deploy_argocd_applications
    initialize_database
    verify_deployment
    display_summary
}

# Run main function
main
