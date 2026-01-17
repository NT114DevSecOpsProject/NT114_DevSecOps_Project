#!/bin/bash
# Test verify endpoint directly from exercises-service pod

NAMESPACE="dev"
POD=$(kubectl get pods -n $NAMESPACE -l app=exercises-service -o jsonpath='{.items[0].metadata.name}')

echo "Testing from pod: $POD"
echo ""

echo "=== Step 1: Check env var ==="
kubectl exec -n $NAMESPACE $POD -- sh -c 'echo "USER_MANAGEMENT_SERVICE_URL=${USER_MANAGEMENT_SERVICE_URL:-NOT_SET}"'
echo ""

echo "=== Step 2: Test DNS resolution ==="
kubectl exec -n $NAMESPACE $POD -- sh -c 'nslookup user-management-dev-user-management-service || getent hosts user-management-dev-user-management-service'
echo ""

echo "=== Step 3: Test HTTP connectivity ==="
kubectl exec -n $NAMESPACE $POD -- sh -c 'curl -s -o /dev/null -w "HTTP %{http_code}\n" http://user-management-dev-user-management-service:8081/api/auth/health || echo "Connection failed"'
echo ""

echo "=== Step 4: Get a real admin token ==="
echo "You need to manually login first. Run this command:"
echo ""
echo "  # Get API Gateway URL"
echo "  kubectl get svc -n dev api-gateway-dev-api-gateway"
echo ""
echo "  # Login (replace with your admin credentials)"
echo "  curl -X POST http://<API-GATEWAY-IP>:8080/api/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@example.com\",\"password\":\"yourpassword\"}'"
echo ""
echo "  # Copy the auth_token, then test verify:"
echo "  TOKEN='your_token_here'"
echo "  kubectl exec -n $NAMESPACE $POD -- sh -c \"curl -H 'Authorization: Bearer \$TOKEN' http://user-management-dev-user-management-service:8081/api/auth/verify\""
echo ""

echo "=== Step 5: Check what URL the code is actually using ==="
kubectl exec -n $NAMESPACE $POD -- python3 -c "
import os
import sys

# Simulate the code logic
USER_MANAGEMENT_SERVICE_URL = os.environ.get('USER_MANAGEMENT_SERVICE_URL', 'https://host.docker.internal:5001')

def _get_user_service_url():
    url = os.environ.get('USER_MANAGEMENT_SERVICE_URL', USER_MANAGEMENT_SERVICE_URL)
    if os.environ.get('FLASK_ENV') == 'production' and url.startswith('http://'):
        url = 'https://' + url[len('http://'):]
    return url

print(f'DEFAULT: {USER_MANAGEMENT_SERVICE_URL}')
print(f'FROM ENV: {os.environ.get(\"USER_MANAGEMENT_SERVICE_URL\", \"NOT_SET\")}')
print(f'FINAL URL: {_get_user_service_url()}')
print(f'VERIFY ENDPOINT: {_get_user_service_url()}/api/auth/verify')
" 2>/dev/null || echo "Python check failed"
