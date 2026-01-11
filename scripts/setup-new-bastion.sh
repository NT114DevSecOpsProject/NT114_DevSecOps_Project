#!/bin/bash

# Script: Setup SSH Key for New Bastion Host
# Run this when bastion is recreated

set -e

echo "========================================"
echo "  Setup New Bastion Host"
echo "========================================"
echo ""

# Step 1: Get new bastion instance ID and IP
echo "[1/4] Finding new bastion instance..."
BASTION_INFO=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=nt114-bastion-prod" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].[InstanceId,PublicIpAddress]' \
    --output text)

if [ -z "$BASTION_INFO" ]; then
    echo "ERROR: Bastion instance not found!"
    echo "Make sure bastion is running with tag Name=nt114-bastion-prod"
    exit 1
fi

INSTANCE_ID=$(echo "$BASTION_INFO" | awk '{print $1}')
PUBLIC_IP=$(echo "$BASTION_INFO" | awk '{print $2}')

echo "  Instance ID: $INSTANCE_ID"
echo "  Public IP:   $PUBLIC_IP"
echo ""

# Step 2: Read SSH public key
echo "[2/4] Reading SSH public key..."
PUBLIC_KEY_PATH="$HOME/.ssh/bastion-prod.pub"

if [ ! -f "$PUBLIC_KEY_PATH" ]; then
    echo "ERROR: SSH public key not found at $PUBLIC_KEY_PATH"
    echo "Run this command first to generate key:"
    echo '  ssh-keygen -t rsa -b 4096 -f ~/.ssh/bastion-prod -N ""'
    exit 1
fi

PUBLIC_KEY=$(cat "$PUBLIC_KEY_PATH")
echo "  Key loaded: $(echo $PUBLIC_KEY | awk '{print $3}')"
echo ""

# Step 3: Add SSH key to bastion via SSM
echo "[3/4] Adding SSH key to bastion via AWS SSM..."

COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"echo '$PUBLIC_KEY' >> /home/ec2-user/.ssh/authorized_keys\",\"chmod 600 /home/ec2-user/.ssh/authorized_keys\"]" \
    --query 'Command.CommandId' \
    --output text)

echo "  Command ID: $COMMAND_ID"
echo "  Waiting for command to complete..."
sleep 5

COMMAND_STATUS=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query 'Status' \
    --output text)

if [ "$COMMAND_STATUS" = "Success" ]; then
    echo "  SSH key added successfully!"
else
    echo "  WARNING: Command status: $COMMAND_STATUS"
fi
echo ""

# Step 4: Test SSH connection
echo "[4/4] Testing SSH connection..."
if ssh -i ~/.ssh/bastion-prod ec2-user@$PUBLIC_IP echo "Connection successful!" 2>/dev/null; then
    echo "  Connection successful!"
else
    echo "  Connection failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "New bastion details:"
echo "  Instance ID: $INSTANCE_ID"
echo "  Public IP:   $PUBLIC_IP"
echo ""
echo "Updated tunnel commands:"
echo ""
echo "ArgoCD (Port 8080):"
echo "  ssh -i ~/.ssh/bastion-prod -L 8080:internal-k8s-argocdinternal-79d958dfa2-2143387899.us-east-1.elb.amazonaws.com:80 ec2-user@$PUBLIC_IP -N"
echo ""
echo "Grafana (Port 3000):"
echo "  ssh -i ~/.ssh/bastion-prod -L 3000:internal-k8s-monitoringinterna-afbe3806af-302341169.us-east-1.elb.amazonaws.com:80 ec2-user@$PUBLIC_IP -N"
echo ""
