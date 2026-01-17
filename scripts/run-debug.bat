@echo off
REM Windows batch script to run Kubernetes debug commands

echo ============================================
echo DEBUG: Admin Exercise Creation Issue
echo ============================================
echo.

echo [1] Checking exercises-service pods...
kubectl get pods -n dev -l app=exercises-service
echo.

echo [2] Checking image tag...
kubectl get pods -n dev -l app=exercises-service -o jsonpath="{.items[0].spec.containers[0].image}"
echo.
echo.

echo [3] Checking USER_MANAGEMENT_SERVICE_URL env var...
FOR /F "tokens=*" %%i IN ('kubectl get pods -n dev -l app=exercises-service -o jsonpath^="{.items[0].metadata.name}"') DO SET POD_NAME=%%i
kubectl exec -n dev %POD_NAME% -- env | findstr USER_MANAGEMENT_SERVICE_URL
echo.

echo [4] Checking recent logs with admin/verify keywords...
kubectl logs -n dev %POD_NAME% --tail=50 | findstr /I "admin verify permission"
echo.

echo [5] Testing service connectivity...
kubectl run -n dev test-curl --image=curlimages/curl:latest --rm -i --restart=Never --timeout=5s -- curl -s http://user-management-dev-user-management-service:8081/api/auth/health
echo.

echo [6] Checking admin users in database...
FOR /F "tokens=*" %%i IN ('kubectl get pods -n dev -l app=user-management-service -o jsonpath^="{.items[0].metadata.name}"') DO SET USER_POD=%%i
kubectl exec -n dev %USER_POD% -- python3 -c "import sys; sys.path.insert(0, '/app'); from app.models import User, db; from app.main import create_app; app = create_app(); exec('with app.app_context():\n admins = User.query.filter_by(admin=True).all()\n print(f\"Admin users: {len(admins)}\")\n for u in admins:\n  print(f\"  - {u.username} ({u.email})\")')"
echo.

echo ============================================
echo Debug complete. Please review output above.
echo ============================================
pause
