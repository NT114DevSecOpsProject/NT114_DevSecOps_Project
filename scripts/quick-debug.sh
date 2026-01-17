#!/bin/bash
# Quick debug script for admin issue

echo "=== QUICK DEBUG ==="
echo ""

NAMESPACE="dev"
POD=$(kubectl get pods -n $NAMESPACE -l app=exercises-service -o jsonpath='{.items[0].metadata.name}')

echo "1. Current image tag:"
kubectl get pods -n $NAMESPACE -l app=exercises-service -o jsonpath='{.items[0].spec.containers[0].image}'
echo ""
echo ""

echo "2. USER_MANAGEMENT_SERVICE_URL env:"
kubectl exec -n $NAMESPACE $POD -- env | grep USER_MANAGEMENT_SERVICE_URL || echo "NOT SET!"
echo ""

echo "3. Recent logs with 'admin' or 'verify':"
kubectl logs -n $NAMESPACE $POD --tail=50 | grep -i -E "(admin|verify|permission)" | tail -10
echo ""

echo "4. Admin users count:"
USER_POD=$(kubectl get pods -n $NAMESPACE -l app=user-management-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $NAMESPACE $USER_POD -- python3 -c "
import sys
sys.path.insert(0, '/app')
from app.models import User, db
from app.main import create_app
app = create_app()
with app.app_context():
    admins = User.query.filter_by(admin=True).all()
    print(f'Admin users: {len(admins)}')
    for u in admins:
        print(f'  - {u.username} ({u.email})')
" 2>/dev/null

echo ""
echo "5. Test service connectivity:"
kubectl run -n $NAMESPACE test-curl --image=curlimages/curl:latest --rm -i --restart=Never --timeout=5s -- \
  curl -s http://user-management-dev-user-management-service:8081/api/auth/health 2>/dev/null
