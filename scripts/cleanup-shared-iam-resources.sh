#!/bin/bash

# Script: Cleanup Shared IAM Resources
# Purpose: Remove old IAM resources without environment suffix
#          to allow Terraform to create new ones with -prod/-dev suffix

set -e

echo "========================================"
echo "  Cleanup Shared IAM Resources"
echo "========================================"
echo ""
echo "This script will DELETE the following IAM resources:"
echo "  - bastion-host-role (IAM Role)"
echo "  - nt114-devsecops-github-actions-ecr-policy (IAM Policy)"
echo "  - nt114-devsecops-github-actions-user (IAM User)"
echo "  - eks-admin-group (IAM Group)"
echo ""
echo "After deletion, Terraform will create NEW resources with environment suffix:"
echo "  - bastion-host-role-prod"
echo "  - nt114-devsecops-github-actions-ecr-policy-prod"
echo "  - nt114-devsecops-github-actions-user-prod"
echo "  - eks-prod-admin-group"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "========================================"
echo "  Step 1: Cleanup Bastion IAM Role"
echo "========================================"
echo ""

# 1. Remove bastion instance profile association (if exists)
echo "[1/4] Checking bastion instances..."
BASTION_INSTANCES=$(aws ec2 describe-instances \
    --filters "Name=iam-instance-profile.arn,Values=*bastion-host-role*" "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text)

if [ -n "$BASTION_INSTANCES" ]; then
    echo "WARNING: Found bastion instances using this role:"
    echo "$BASTION_INSTANCES"
    echo "You need to terminate these instances first."
    read -p "Terminate instances now? (yes/no): " terminate
    if [ "$terminate" = "yes" ]; then
        for instance in $BASTION_INSTANCES; do
            echo "Terminating $instance..."
            aws ec2 terminate-instances --instance-ids $instance
        done
        echo "Waiting for instances to terminate..."
        aws ec2 wait instance-terminated --instance-ids $BASTION_INSTANCES
        echo "Instances terminated."
    else
        echo "Skipping bastion role cleanup (instances still using it)"
    fi
fi

# 2. Detach policies from bastion role
echo "[2/4] Detaching policies from bastion-host-role..."
BASTION_POLICIES=$(aws iam list-attached-role-policies --role-name bastion-host-role --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || echo "")

if [ -n "$BASTION_POLICIES" ]; then
    for policy in $BASTION_POLICIES; do
        echo "  Detaching $policy"
        aws iam detach-role-policy --role-name bastion-host-role --policy-arn $policy
    done
else
    echo "  No attached policies found (role may not exist)"
fi

# 3. Remove instance profile
echo "[3/4] Removing bastion instance profile..."
aws iam remove-role-from-instance-profile --instance-profile-name bastion-host-role --role-name bastion-host-role 2>/dev/null || echo "  Instance profile association not found"
aws iam delete-instance-profile --instance-profile-name bastion-host-role 2>/dev/null || echo "  Instance profile not found"

# 4. Delete bastion role
echo "[4/4] Deleting bastion-host-role..."
aws iam delete-role --role-name bastion-host-role 2>/dev/null && echo "  Deleted successfully" || echo "  Role not found"

echo ""
echo "========================================"
echo "  Step 2: Cleanup GitHub Actions User"
echo "========================================"
echo ""

# 1. List and delete access keys
echo "[1/5] Deleting GitHub Actions user access keys..."
ACCESS_KEYS=$(aws iam list-access-keys --user-name nt114-devsecops-github-actions-user --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null || echo "")

if [ -n "$ACCESS_KEYS" ]; then
    for key in $ACCESS_KEYS; do
        echo "  Deleting access key: $key"
        aws iam delete-access-key --user-name nt114-devsecops-github-actions-user --access-key-id $key
    done
    echo "  All access keys deleted"
else
    echo "  No access keys found (user may not exist)"
fi

# 2. Detach policies from user
echo "[2/5] Detaching policies from GitHub Actions user..."
USER_POLICIES=$(aws iam list-attached-user-policies --user-name nt114-devsecops-github-actions-user --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || echo "")

if [ -n "$USER_POLICIES" ]; then
    for policy in $USER_POLICIES; do
        echo "  Detaching $policy"
        aws iam detach-user-policy --user-name nt114-devsecops-github-actions-user --policy-arn $policy
    done
else
    echo "  No attached policies found"
fi

# 3. Remove user from groups
echo "[3/5] Removing user from IAM groups..."
USER_GROUPS=$(aws iam list-groups-for-user --user-name nt114-devsecops-github-actions-user --query 'Groups[].GroupName' --output text 2>/dev/null || echo "")

if [ -n "$USER_GROUPS" ]; then
    for group in $USER_GROUPS; do
        echo "  Removing from group: $group"
        aws iam remove-user-from-group --user-name nt114-devsecops-github-actions-user --group-name $group
    done
else
    echo "  User not in any groups"
fi

# 4. Delete inline policies
echo "[4/5] Deleting inline policies..."
INLINE_POLICIES=$(aws iam list-user-policies --user-name nt114-devsecops-github-actions-user --query 'PolicyNames[]' --output text 2>/dev/null || echo "")

if [ -n "$INLINE_POLICIES" ]; then
    for policy in $INLINE_POLICIES; do
        echo "  Deleting inline policy: $policy"
        aws iam delete-user-policy --user-name nt114-devsecops-github-actions-user --policy-name $policy
    done
else
    echo "  No inline policies found"
fi

# 5. Delete user
echo "[5/5] Deleting GitHub Actions user..."
aws iam delete-user --user-name nt114-devsecops-github-actions-user 2>/dev/null && echo "  User deleted successfully" || echo "  User not found"

echo ""
echo "========================================"
echo "  Step 3: Cleanup ECR Policy"
echo "========================================"
echo ""

# Get policy ARN
POLICY_ARN=$(aws iam list-policies --scope Local --query 'Policies[?PolicyName==`nt114-devsecops-github-actions-ecr-policy`].Arn' --output text 2>/dev/null || echo "")

if [ -n "$POLICY_ARN" ]; then
    echo "Found policy: $POLICY_ARN"

    # Delete all non-default policy versions
    echo "[1/2] Deleting policy versions..."
    POLICY_VERSIONS=$(aws iam list-policy-versions --policy-arn $POLICY_ARN --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text 2>/dev/null || echo "")

    if [ -n "$POLICY_VERSIONS" ]; then
        for version in $POLICY_VERSIONS; do
            echo "  Deleting version: $version"
            aws iam delete-policy-version --policy-arn $POLICY_ARN --version-id $version
        done
    else
        echo "  No non-default versions found"
    fi

    # Delete policy
    echo "[2/2] Deleting policy..."
    aws iam delete-policy --policy-arn $POLICY_ARN && echo "  Policy deleted successfully"
else
    echo "Policy not found (already deleted or never existed)"
fi

echo ""
echo "========================================"
echo "  Step 4: Cleanup IAM Admin Group"
echo "========================================"
echo ""

# 1. Remove users from group
echo "[1/4] Removing users from eks-admin-group..."
GROUP_USERS=$(aws iam get-group --group-name eks-admin-group --query 'Users[].UserName' --output text 2>/dev/null || echo "")

if [ -n "$GROUP_USERS" ]; then
    for user in $GROUP_USERS; do
        echo "  Removing user: $user"
        aws iam remove-user-from-group --group-name eks-admin-group --user-name $user
    done
else
    echo "  No users in group (group may not exist)"
fi

# 2. Detach policies from group
echo "[2/4] Detaching policies from eks-admin-group..."
GROUP_POLICIES=$(aws iam list-attached-group-policies --group-name eks-admin-group --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || echo "")

if [ -n "$GROUP_POLICIES" ]; then
    for policy in $GROUP_POLICIES; do
        echo "  Detaching $policy"
        aws iam detach-group-policy --group-name eks-admin-group --policy-arn $policy
    done
else
    echo "  No attached policies found"
fi

# 3. Delete inline policies
echo "[3/4] Deleting inline group policies..."
GROUP_INLINE=$(aws iam list-group-policies --group-name eks-admin-group --query 'PolicyNames[]' --output text 2>/dev/null || echo "")

if [ -n "$GROUP_INLINE" ]; then
    for policy in $GROUP_INLINE; do
        echo "  Deleting inline policy: $policy"
        aws iam delete-group-policy --group-name eks-admin-group --policy-name $policy
    done
else
    echo "  No inline policies found"
fi

# 4. Delete group
echo "[4/4] Deleting eks-admin-group..."
aws iam delete-group --group-name eks-admin-group 2>/dev/null && echo "  Group deleted successfully" || echo "  Group not found"

echo ""
echo "========================================"
echo "  Cleanup Complete!"
echo "========================================"
echo ""
echo "All shared IAM resources have been deleted."
echo ""
echo "Next steps:"
echo "1. Apply Terraform to create new resources with environment suffix:"
echo "   cd terraform/environments/prod"
echo "   terraform apply"
echo ""
echo "2. Update GitHub Secrets with new credentials:"
echo "   - AWS_ACCESS_KEY_ID (from terraform output)"
echo "   - AWS_SECRET_ACCESS_KEY (from terraform output)"
echo ""
echo "3. Verify new resources:"
echo "   aws iam list-users | grep github-actions"
echo "   aws iam list-roles | grep bastion"
echo "   aws iam list-groups | grep admin"
echo ""
