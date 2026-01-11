# Script: Setup SSH Key for New Bastion Host
# Run this when bastion is recreated
# Usage: powershell -ExecutionPolicy Bypass -File setup-new-bastion.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup New Bastion Host" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get new bastion instance ID and IP
Write-Host "[1/4] Finding new bastion instance..." -ForegroundColor Yellow
try {
    $BastionInfo = aws ec2 describe-instances `
        --filters "Name=tag:Name,Values=nt114-bastion-prod" "Name=instance-state-name,Values=running" `
        --query 'Reservations[0].Instances[0].[InstanceId,PublicIpAddress]' `
        --output text

    if ([string]::IsNullOrWhiteSpace($BastionInfo)) {
        throw "Bastion instance not found"
    }

    $InstanceId, $PublicIp = $BastionInfo -split '\s+'

    Write-Host "  Instance ID: $InstanceId" -ForegroundColor Green
    Write-Host "  Public IP:   $PublicIp" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "ERROR: Bastion instance not found!" -ForegroundColor Red
    Write-Host "Make sure bastion is running with tag Name=nt114-bastion-prod" -ForegroundColor Red
    exit 1
}

# Step 2: Read SSH public key
Write-Host "[2/4] Reading SSH public key..." -ForegroundColor Yellow
$PublicKeyPath = "$env:USERPROFILE\.ssh\bastion-prod.pub"

if (-not (Test-Path $PublicKeyPath)) {
    Write-Host "ERROR: SSH public key not found at $PublicKeyPath" -ForegroundColor Red
    Write-Host "Run this command first to generate key:" -ForegroundColor Red
    Write-Host '  ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\bastion-prod -N ""' -ForegroundColor Yellow
    exit 1
}

$PublicKey = (Get-Content $PublicKeyPath -Raw).Trim()
$KeyName = ($PublicKey -split ' ')[2]
Write-Host "  Key loaded: $KeyName" -ForegroundColor Green
Write-Host ""

# Step 3: Add SSH key to bastion via SSM
Write-Host "[3/4] Adding SSH key to bastion via AWS SSM..." -ForegroundColor Yellow

$Commands = @(
    "echo '$PublicKey' >> /home/ec2-user/.ssh/authorized_keys",
    "chmod 600 /home/ec2-user/.ssh/authorized_keys"
)

# Escape for JSON
$CommandsJson = ($Commands | ConvertTo-Json -Compress) -replace '"', '\"'

try {
    $CommandId = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=$CommandsJson" `
        --query 'Command.CommandId' `
        --output text

    Write-Host "  Command ID: $CommandId" -ForegroundColor Green
    Write-Host "  Waiting for command to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    $CommandStatus = aws ssm get-command-invocation `
        --command-id $CommandId `
        --instance-id $InstanceId `
        --query 'Status' `
        --output text

    if ($CommandStatus -eq "Success") {
        Write-Host "  SSH key added successfully!" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Command status: $CommandStatus" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "ERROR: Failed to add SSH key via SSM" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Test SSH connection
Write-Host "[4/4] Testing SSH connection..." -ForegroundColor Yellow
try {
    $TestResult = ssh -i $env:USERPROFILE\.ssh\bastion-prod ec2-user@$PublicIp echo "Connection successful!" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Connection successful!" -ForegroundColor Green
    } else {
        Write-Host "  Connection failed. Error:" -ForegroundColor Red
        Write-Host "  $TestResult" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "  Connection test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "New bastion details:" -ForegroundColor Cyan
Write-Host "  Instance ID: $InstanceId"
Write-Host "  Public IP:   $PublicIp"
Write-Host ""
Write-Host "Updated tunnel commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "ArgoCD (Port 8080):" -ForegroundColor Yellow
Write-Host "  ssh -i $env:USERPROFILE\.ssh\bastion-prod -L 8080:internal-k8s-argocdinternal-79d958dfa2-2143387899.us-east-1.elb.amazonaws.com:80 ec2-user@$PublicIp -N" -ForegroundColor White
Write-Host ""
Write-Host "Grafana (Port 3000):" -ForegroundColor Yellow
Write-Host "  ssh -i $env:USERPROFILE\.ssh\bastion-prod -L 3000:internal-k8s-monitoringinterna-afbe3806af-302341169.us-east-1.elb.amazonaws.com:80 ec2-user@$PublicIp -N" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
