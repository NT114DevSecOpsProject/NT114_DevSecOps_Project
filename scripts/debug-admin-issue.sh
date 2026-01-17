#!/bin/bash

echo "============================================"
echo "DEBUG: Admin Exercise Creation Issue"
echo "Environment: DEV"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NAMESPACE="dev"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. CHECK EXERCISES-SERVICE DEPLOYMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}[1.1] Pods Status:${NC}"
kubectl get pods -n $NAMESPACE -l app=exercises-service -o wide

echo -e "\n${YELLOW}[1.2] Current Image Tags:${NC}"
kubectl get pods -n $NAMESPACE -l app=exercises-service -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}' | column -t

EXPECTED_TAG="26c4de90f558a3b9be7c478606fc721447322092"
CURRENT_TAG=$(kubectl get pods -n $NAMESPACE -l app=exercises-service -o jsonpath='{.items[0].spec.containers[0].image}' | grep -oP ':\K.*')
echo -e "\nExpected tag: ${GREEN}${EXPECTED_TAG}${NC}"
echo -e "Current tag:  ${YELLOW}${CURRENT_TAG}${NC}"

if [[ "$CURRENT_TAG" == "$EXPECTED_TAG" ]]; then
    echo -e "${GREEN}✓ Image tag is correct${NC}"
else
    echo -e "${RED}✗ Image tag mismatch! Pods may not be updated yet.${NC}"
    echo -e "${YELLOW}Action: Wait for ArgoCD sync or run: argocd app sync exercises-service --force${NC}"
fi

echo -e "\n${YELLOW}[1.3] Environment Variables:${NC}"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=exercises-service -o jsonpath='{.items[0].metadata.name}')
echo "Pod: $POD_NAME"
echo ""
kubectl exec -n $NAMESPACE $POD_NAME -- env | grep -E "USER_MANAGEMENT_SERVICE_URL|FLASK_ENV|PORT" || echo "No relevant env vars found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. CHECK USER-MANAGEMENT SERVICE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}[2.1] Service Discovery:${NC}"
kubectl get svc -n $NAMESPACE | grep user-management

echo -e "\n${YELLOW}[2.2] Verify Endpoint Availability:${NC}"
USER_MGMT_SVC="user-management-dev-user-management-service"
echo "Testing: http://${USER_MGMT_SVC}:8081/api/auth/verify"
kubectl run -n $NAMESPACE curl-test --image=curlimages/curl:latest --rm -i --restart=Never --timeout=10s -- \
  curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://${USER_MGMT_SVC}:8081/api/auth/verify 2>/dev/null || \
  echo -e "${RED}✗ Cannot reach user-management service${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. CHECK ADMIN USERS IN DATABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}[3.1] Admin Users:${NC}"
USER_MGMT_POD=$(kubectl get pods -n $NAMESPACE -l app=user-management-service -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n $NAMESPACE $USER_MGMT_POD -- python3 -c "
import sys
sys.path.insert(0, '/app')
from app.models import User, db
from app.main import create_app

app = create_app()
with app.app_context():
    admin_users = User.query.filter_by(admin=True).all()
    print(f'Total admin users: {len(admin_users)}')
    print('')
    if len(admin_users) == 0:
        print('⚠️  NO ADMIN USERS FOUND!')
        print('')
    for user in admin_users:
        print(f'  ✓ ID: {user.id}')
        print(f'    Username: {user.username}')
        print(f'    Email: {user.email}')
        print(f'    Admin: {user.admin}')
        print(f'    Active: {user.active}')
        print('')

    print('All users:')
    all_users = User.query.all()
    for user in all_users:
        admin_flag = '👑' if user.admin else '👤'
        active_flag = '✓' if user.active else '✗'
        print(f'  {admin_flag} {user.username} ({user.email}) - Admin: {user.admin}, Active: {user.active}')
" 2>/dev/null || echo -e "${RED}✗ Failed to query database${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. CHECK EXERCISES-SERVICE LOGS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}[4.1] Recent Authentication Logs:${NC}"
kubectl logs -n $NAMESPACE $POD_NAME --tail=100 | grep -i -E "(verify|admin|auth|token|permission|fail)" | tail -20 || \
  echo "No relevant logs found"

echo -e "\n${YELLOW}[4.2] Recent Error Logs:${NC}"
kubectl logs -n $NAMESPACE $POD_NAME --tail=100 | grep -i -E "(error|exception|warning)" | tail -10 || \
  echo "No errors found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. TEST TOKEN VERIFICATION FLOW"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}[5.1] Instructions to test manually:${NC}"
echo ""
echo "1. Login to get admin token:"
echo "   curl -X POST http://<API_GATEWAY_URL>/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@example.com\",\"password\":\"your_password\"}'"
echo ""
echo "2. Copy the auth_token from response"
echo ""
echo "3. Test verify endpoint:"
echo "   kubectl run -n $NAMESPACE curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \\"
echo "     curl -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "     http://${USER_MGMT_SVC}:8081/api/auth/verify"
echo ""
echo "4. Create exercise with token:"
echo "   curl -X POST http://<API_GATEWAY_URL>/api/exercises \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"title\":\"Test\",\"body\":\"Test\",\"difficulty\":1,\"test_cases\":[],\"solutions\":[]}'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. SUMMARY & RECOMMENDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if image tag is correct
if [[ "$CURRENT_TAG" != "$EXPECTED_TAG" ]]; then
    echo -e "${RED}⚠️  Issue 1: Pods not updated with latest image${NC}"
    echo -e "   Fix: argocd app sync exercises-service --force"
    echo ""
fi

# Check admin users
ADMIN_COUNT=$(kubectl exec -n $NAMESPACE $USER_MGMT_POD -- python3 -c "
import sys
sys.path.insert(0, '/app')
from app.models import User, db
from app.main import create_app
app = create_app()
with app.app_context():
    print(User.query.filter_by(admin=True).count())
" 2>/dev/null)

if [[ "$ADMIN_COUNT" == "0" ]]; then
    echo -e "${RED}⚠️  Issue 2: No admin users in database${NC}"
    echo -e "   Fix: Create an admin user or update existing user to admin=true"
    echo ""
fi

echo -e "${GREEN}Next steps:${NC}"
echo "1. If pods not updated → Sync ArgoCD"
echo "2. If no admin users → Create/update admin user"
echo "3. Check logs for specific error messages"
echo "4. Test token verification manually"
echo ""
echo "For real-time monitoring:"
echo "  kubectl logs -n $NAMESPACE -l app=exercises-service -f"
echo ""
