# Quick test script for admin exercise creation
# Run: .\scripts\quick-test-admin.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "ADMIN EXERCISE CREATION TEST" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get API Gateway service
Write-Host "[1] Getting API Gateway URL..." -ForegroundColor Yellow
$apiGateway = kubectl get svc -n dev -l app.kubernetes.io/name=api-gateway -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}'
if (!$apiGateway) {
    $apiGateway = kubectl get svc -n dev -l app.kubernetes.io/name=api-gateway -o jsonpath='{.items[0].spec.clusterIP}'
}
Write-Host "API Gateway: $apiGateway" -ForegroundColor Green
Write-Host ""

# Prompt for credentials
Write-Host "[2] Admin Login" -ForegroundColor Yellow
$email = Read-Host "Enter admin email (admin@gmail.com)"
if (!$email) { $email = "admin@gmail.com" }
$password = Read-Host "Enter admin password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://$apiGateway:8080/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    if ($response.status -eq "success") {
        Write-Host "✓ Login successful!" -ForegroundColor Green
        Write-Host "User: $($response.data.username)" -ForegroundColor Green
        Write-Host "Admin: $($response.data.admin)" -ForegroundColor $(if ($response.data.admin) { "Green" } else { "Red" })

        if (!$response.data.admin) {
            Write-Host "❌ ERROR: User is NOT admin!" -ForegroundColor Red
            Write-Host "This is why you can't create exercises." -ForegroundColor Red
            Write-Host ""
            Write-Host "Solution: Login with admin@gmail.com or admin2@gmail.com" -ForegroundColor Yellow
            exit 1
        }

        $token = $response.auth_token
        Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
    } else {
        Write-Host "❌ Login failed: $($response.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test verify endpoint
Write-Host "[3] Testing verify endpoint..." -ForegroundColor Yellow
$testPod = "test-verify-$(Get-Random -Maximum 99999)"
$verifyCmd = "curl -s -H 'Authorization: Bearer $token' http://user-management-dev-user-management-service:8081/api/auth/verify"

try {
    $verifyResult = kubectl run -n dev $testPod --image=curlimages/curl:latest --rm -i --restart=Never -- sh -c $verifyCmd 2>&1 | Out-String
    $verifyData = $verifyResult | ConvertFrom-Json

    if ($verifyData.status -eq "success" -and $verifyData.data.admin) {
        Write-Host "✓ Verify endpoint OK - User is admin" -ForegroundColor Green
    } else {
        Write-Host "❌ Verify failed or user not admin" -ForegroundColor Red
        Write-Host $verifyResult
        exit 1
    }
} catch {
    Write-Host "⚠ Verify test skipped (kubectl run issue)" -ForegroundColor Yellow
}

Write-Host ""

# Create exercise
Write-Host "[4] Creating test exercise..." -ForegroundColor Yellow
$exerciseBody = @{
    title = "Test Exercise $(Get-Date -Format 'HH:mm:ss')"
    body = "This is a test exercise created by automated script"
    difficulty = 1
    test_cases = @("print('hello')")
    solutions = @("hello")
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "http://$apiGateway:8080/api/exercises" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ContentType "application/json" `
        -Body $exerciseBody

    if ($createResponse.status -eq "success") {
        Write-Host "✅ SUCCESS! Exercise created!" -ForegroundColor Green
        Write-Host "Exercise ID: $($createResponse.data.id)" -ForegroundColor Green
        Write-Host "Title: $($createResponse.data.title)" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Admin exercise creation is WORKING!" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: $($createResponse.message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Debug info:" -ForegroundColor Yellow
        Write-Host "- User email: $email"
        Write-Host "- User is admin in DB: $(if ($response.data.admin) { 'YES' } else { 'NO' })"
        Write-Host "- Token valid: YES (login successful)"
        Write-Host ""
        Write-Host "Check logs:" -ForegroundColor Yellow
        Write-Host "kubectl logs -n dev -l app.kubernetes.io/name=exercises-service --tail=20"
    }
} catch {
    Write-Host "❌ Create exercise error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Full error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Test complete" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
