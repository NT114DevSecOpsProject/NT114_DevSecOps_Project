#!/bin/bash
# Comprehensive AWS Resource Cleanup - Delete resources WITHOUT tag Project=NT114_DevSecOps
set +e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_TAG="Project"
PROJECT_VALUE="NT114_DevSecOps"

# Script mode - defaults to dry-run for safety
DRY_RUN=true
FORCE=false
VERBOSE=false

# Resource protection settings
MIN_RESOURCE_AGE_HOURS=24
MAX_RESOURCES_THRESHOLD=100

# Helper function to display usage
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --execute    Actually delete resources (default: dry-run)"
    echo "  --force      Skip confirmation prompts"
    echo "  --verbose    Show detailed output"
    echo "  --help, -h   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Dry-run mode (safe)"
    echo "  $0 --execute          # Execute actual deletion"
    echo "  $0 --execute --force  # Execute without confirmations"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --execute)
            DRY_RUN=false
            echo "🚀 EXECUTE MODE ENABLED - Resources will be deleted!"
            shift
            ;;
        --force)
            FORCE=true
            echo "⚡ FORCE MODE ENABLED - Confirmation prompts skipped"
            shift
            ;;
        --verbose)
            VERBOSE=true
            echo "📝 VERBOSE MODE ENABLED"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "========================================="
echo "🗑️  AWS RESOURCE CLEANUP SCRIPT"
echo "========================================="
echo "Region: $AWS_REGION"
echo "Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY-RUN (no actual deletion)" || echo "EXECUTE (resources will be deleted)")"
echo "Target: Resources WITHOUT tag $PROJECT_TAG=$PROJECT_VALUE"
echo "Protection: Resources younger than $MIN_RESOURCE_AGE_HOURS hours will be preserved"
echo ""

# Helper function to check if resource LACKS the project tag
lacks_project_tag() {
    local tags="$1"
    local resource_name="$2"
    local resource_type="$3"

    # Check if resource has the correct project tag
    if echo "$tags" | grep -q "\"$PROJECT_TAG\"" && echo "$tags" | grep -q "\"$PROJECT_VALUE\""; then
        [ "$VERBOSE" = "true" ] && echo "  ✅ $resource_type $resource_name has correct tag - preserving"
        return 1  # Has correct tag, return false (don't delete)
    fi

    # Check if resource is in whitelist
    if is_resource_whitelisted "$resource_name" "$resource_type"; then
        return 1  # Whitelisted, don't delete
    fi

    [ "$VERBOSE" = "true" ] && echo "  ❌ $resource_type $resource_name lacks correct tag - marked for deletion"
    return 0  # Lacks correct tag, return true (safe to delete)
}

# Helper function to check if resource is whitelisted for protection
is_resource_whitelisted() {
    local resource_name="$1"
    local resource_type="$2"

    # Whitelist patterns for critical infrastructure
    local whitelist_patterns=(
        "Default"
        "default"
        "sg-*default*"
        "vpc-*default*"
        "rtb-*default*"
        "*production*"
        "*prod*"
        "*critical*"
        "*essential*"
        "*managed*"
    )

    # Always protect default VPC resources
    if [[ "$resource_type" == "VPC" || "$resource_type" == "SecurityGroup" || "$resource_type" == "RouteTable" ]]; then
        if [[ "$resource_name" == *"default"* ]]; then
            [ "$VERBOSE" = "true" ] && echo "  🛡️  Default resource protected: $resource_name"
            return 0
        fi
    fi

    # Check whitelist patterns
    for pattern in "${whitelist_patterns[@]}"; do
        if [[ "$resource_name" == $pattern ]]; then
            echo "  🛡️  Resource whitelisted: $resource_name"
            return 0
        fi
    done

    return 1
}

# Helper function to check if resource is too new to delete
is_resource_too_new() {
    local creation_time="$1"

    if [ -z "$creation_time" ]; then
        return 1  # No creation time info, assume it's old enough
    fi

    # Convert creation time to timestamp (handles AWS date format)
    local creation_ts=$(date -d "$creation_time" +%s 2>/dev/null || echo 0)
    local current_ts=$(date +%s)
    local age_hours=$(( (current_ts - creation_ts) / 3600 ))

    if [ $age_hours -lt $MIN_RESOURCE_AGE_HOURS ]; then
        echo "  🛡️  Resource too new ($age_hours hours old): $creation_time"
        return 0  # Too new, don't delete
    fi

    return 1  # Old enough to delete
}

# Helper function for interactive confirmation
confirm_action() {
    local message="$1"
    local resource_count="$2"

    # Skip confirmation if force mode is enabled
    if [ "$FORCE" = "true" ]; then
        return 0
    fi

    # Add resource count to message for awareness
    if [ "$resource_count" -gt 10 ]; then
        echo "  ⚠️  WARNING: About to process $resource_count resources!"
        echo -n "  ❓ $message Continue anyway? [y/N]: "
    else
        echo -n "  ❓ $message [y/N]: "
    fi

    read -r response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            echo "  ❌ Operation cancelled by user"
            return 1
            ;;
    esac
}

# Function to execute AWS command with dry-run support
execute_aws_cmd() {
    local cmd="$1"
    local resource_type="$2"
    local resource_name="$3"

    if [ "$DRY_RUN" = "true" ]; then
        echo "  📋 [DRY-RUN] Would execute: $cmd"
        return 0
    else
        echo "  🗑️  Deleting $resource_type: $resource_name"
        eval "$cmd" 2>/dev/null
        return $?
    fi
}

# 1. Delete EKS Node Groups & Clusters WITHOUT project tag
echo "1️⃣  Checking EKS Clusters for cleanup..."
CLUSTERS=$(aws eks list-clusters --region $AWS_REGION --query 'clusters[]' --output text 2>/dev/null)

CLUSTER_COUNT=0
DELETE_CLUSTER_LIST=""

for CLUSTER in $CLUSTERS; do
    TAGS=$(aws eks describe-cluster --name $CLUSTER --region $AWS_REGION --query 'cluster.tags' --output json 2>/dev/null)

    if lacks_project_tag "$TAGS" "$CLUSTER" "EKS Cluster"; then
        CLUSTER_COUNT=$((CLUSTER_COUNT + 1))
        DELETE_CLUSTER_LIST="$DELETE_CLUSTER_LIST $CLUSTER"
    fi
done

if [ $CLUSTER_COUNT -gt 0 ]; then
    if confirm_action "Delete $CLUSTER_COUNT EKS cluster(s) without proper Project tag?" $CLUSTER_COUNT; then
        for CLUSTER in $DELETE_CLUSTER_LIST; do
            echo "  🗑️  Processing EKS Cluster: $CLUSTER (lacks proper tag)"

            # Delete all node groups first
            NODEGROUPS=$(aws eks list-nodegroups --cluster-name $CLUSTER --region $AWS_REGION --query 'nodegroups[]' --output text 2>/dev/null)
            for NG in $NODEGROUPS; do
                execute_aws_cmd "aws eks delete-nodegroup --cluster-name $CLUSTER --nodegroup-name $NG --region $AWS_REGION" "EKS NodeGroup" "$NG"
            done

            # Only wait if we're actually deleting
            if [ "$DRY_RUN" = "false" ] && [ -n "$NODEGROUPS" ]; then
                echo "    ⏳ Waiting for node groups to delete..."
                sleep 30
            fi

            # Delete cluster
            execute_aws_cmd "aws eks delete-cluster --name $CLUSTER --region $AWS_REGION" "EKS Cluster" "$CLUSTER"
        done
    else
        echo "  ❌ Skipped EKS cluster cleanup"
    fi
else
    echo "  ✅ No EKS clusters found without proper Project tag"
fi

echo "  ✅ EKS cleanup check completed"
echo ""

# 2. Delete Load Balancers WITHOUT project tag
echo "2️⃣  Checking Load Balancers for cleanup..."
LB_COUNT=0

# Application/Network Load Balancers
LBS=$(aws elbv2 describe-load-balancers --region $AWS_REGION --query 'LoadBalancers[].[LoadBalancerArn,LoadBalancerName]' --output text 2>/dev/null)
while IFS=$'\t' read -r LB_ARN LB_NAME; do
    if [ -n "$LB_ARN" ]; then
        TAGS=$(aws elbv2 describe-tags --resource-arns "$LB_ARN" --region $AWS_REGION --query 'TagDescriptions[0].Tags' --output json 2>/dev/null)
        if lacks_project_tag "$TAGS" "$LB_NAME" "Load Balancer"; then
            LB_COUNT=$((LB_COUNT + 1))
            DELETE_LB_LIST="$DELETE_LB_LIST $LB_ARN|$LB_NAME"
        fi
    fi
done <<< "$LBS"

# Classic Load Balancers
CLB=$(aws elb describe-load-balancers --region $AWS_REGION --query 'LoadBalancerDescriptions[].LoadBalancerName' --output text 2>/dev/null)
for LB in $CLB; do
    TAGS=$(aws elb describe-tags --load-balancer-names $LB --region $AWS_REGION --query 'TagDescriptions[0].Tags' --output json 2>/dev/null)
    if lacks_project_tag "$TAGS" "$LB" "Classic Load Balancer"; then
        LB_COUNT=$((LB_COUNT + 1))
        DELETE_CLB_LIST="$DELETE_CLB_LIST $LB"
    fi
done

if [ $LB_COUNT -gt 0 ]; then
    if confirm_action "Delete $LB_COUNT load balancer(s) without proper Project tag?" $LB_COUNT; then
        # Delete Application/Network Load Balancers
        for LB_INFO in $DELETE_LB_LIST; do
            LB_ARN=$(echo "$LB_INFO" | cut -d'|' -f1)
            LB_NAME=$(echo "$LB_INFO" | cut -d'|' -f2)
            execute_aws_cmd "aws elbv2 delete-load-balancer --load-balancer-arn '$LB_ARN' --region $AWS_REGION" "Load Balancer" "$LB_NAME"
        done

        # Delete Classic Load Balancers
        for LB in $DELETE_CLB_LIST; do
            execute_aws_cmd "aws elb delete-load-balancer --load-balancer-name '$LB' --region $AWS_REGION" "Classic Load Balancer" "$LB"
        done
    else
        echo "  ❌ Skipped Load Balancer cleanup"
    fi
else
    echo "  ✅ No Load Balancers found without proper Project tag"
fi

echo "  ✅ Load Balancer cleanup check completed"
echo ""

# 3. Terminate EC2 Instances WITHOUT project tag
echo "3️⃣  Checking EC2 Instances for cleanup..."
INSTANCE_COUNT=0
DELETE_INSTANCE_LIST=""

# Get ALL instances (not just tagged ones) and check each one
ALL_INSTANCES=$(aws ec2 describe-instances --region $AWS_REGION \
    --filters "Name=instance-state-name,Values=running,stopped,stopping" \
    --query 'Reservations[].Instances[].[InstanceId,Tags,LaunchTime]' --output json 2>/dev/null)

echo "$ALL_INSTANCES" | jq -r '.[] | "\(.[])"' | while IFS=$'\n' read -r INSTANCE_ID && read -r TAGS && read -r LAUNCH_TIME; do
    # Check if instance lacks proper project tag and isn't too new
    if lacks_project_tag "$TAGS" "$INSTANCE_ID" "EC2 Instance" && ! is_resource_too_new "$LAUNCH_TIME"; then
        INSTANCE_COUNT=$((INSTANCE_COUNT + 1))
        DELETE_INSTANCE_LIST="$DELETE_INSTANCE_LIST $INSTANCE_ID"
    fi
done

# Re-query with proper counting since the while loop creates a subshell
INSTANCE_COUNT=$(aws ec2 describe-instances --region $AWS_REGION \
    --filters "Name=instance-state-name,Values=running,stopped,stopping" \
    --query 'Reservations[].Instances[].[InstanceId,Tags,LaunchTime]' --output json 2>/dev/null | \
    jq -r '.[] | "\(.[])"' | \
    while IFS=$'\n' read -r INSTANCE_ID && read -r TAGS && read -r LAUNCH_TIME; do
        if lacks_project_tag "$TAGS" "$INSTANCE_ID" "EC2 Instance" && ! is_resource_too_new "$LAUNCH_TIME"; then
            echo "$INSTANCE_ID"
        fi
    done | wc -l)

if [ "$INSTANCE_COUNT" -gt 0 ]; then
    # Get the actual list of instances to delete
    DELETE_INSTANCE_LIST=$(aws ec2 describe-instances --region $AWS_REGION \
        --filters "Name=instance-state-name,Values=running,stopped,stopping" \
        --query 'Reservations[].Instances[].[InstanceId,Tags,LaunchTime]' --output json 2>/dev/null | \
        jq -r '.[] | "\(.[])"' | \
        while IFS=$'\n' read -r INSTANCE_ID && read -r TAGS && read -r LAUNCH_TIME; do
            if lacks_project_tag "$TAGS" "$INSTANCE_ID" "EC2 Instance" && ! is_resource_too_new "$LAUNCH_TIME"; then
                echo "$INSTANCE_ID"
            fi
        done | tr '\n' ' ')

    if confirm_action "Terminate $INSTANCE_COUNT EC2 instance(s) without proper Project tag?" $INSTANCE_COUNT; then
        execute_aws_cmd "aws ec2 terminate-instances --instance-ids $DELETE_INSTANCE_LIST --region $AWS_REGION" "EC2 Instances" "$DELETE_INSTANCE_LIST"

        if [ "$DRY_RUN" = "false" ]; then
            echo "  ⏳ Waiting for instances to terminate..."
            sleep 60
        fi
    else
        echo "  ❌ Skipped EC2 instance cleanup"
    fi
else
    echo "  ✅ No EC2 instances found without proper Project tag"
fi

echo "  ✅ EC2 instance cleanup check completed"
echo ""

# 4. Delete Auto Scaling Groups with project tag
echo "4️⃣  Deleting Auto Scaling Groups with project tag..."
ASGS=$(aws autoscaling describe-auto-scaling-groups --region $AWS_REGION --query 'AutoScalingGroups[].[AutoScalingGroupName]' --output text 2>/dev/null)
for ASG in $ASGS; do
    if [ -n "$ASG" ]; then
        TAGS=$(aws autoscaling describe-tags --filters "Name=auto-scaling-group,Values=$ASG" --region $AWS_REGION --query 'Tags' --output json 2>/dev/null)
        if has_project_tag "$TAGS"; then
            echo "  🗑️  Deleting ASG: $ASG (tagged)"
            aws autoscaling delete-auto-scaling-group --auto-scaling-group-name $ASG --force-delete --region $AWS_REGION 2>/dev/null
        fi
    fi
done
echo "  ✅ ASGs deleted"
echo ""

# 5. Delete Launch Templates with project tag
echo "5️⃣  Deleting Launch Templates with project tag..."
LTS=$(aws ec2 describe-launch-templates --region $AWS_REGION \
    --filters "Name=tag:$PROJECT_TAG,Values=$PROJECT_VALUE" \
    --query 'LaunchTemplates[].LaunchTemplateId' --output text 2>/dev/null)
for LT in $LTS; do
    echo "  🗑️  Deleting Launch Template: $LT"
    aws ec2 delete-launch-template --launch-template-id $LT --region $AWS_REGION 2>/dev/null
done
echo "  ✅ Launch Templates deleted"
echo ""

# 6. Delete NAT Gateways with project tag
echo "6️⃣  Deleting NAT Gateways with project tag..."
NGWS=$(aws ec2 describe-nat-gateways --region $AWS_REGION \
    --filter "Name=tag:$PROJECT_TAG,Values=$PROJECT_VALUE" "Name=state,Values=available" \
    --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null)
for NGW in $NGWS; do
    echo "  🗑️  Deleting NAT Gateway: $NGW"
    aws ec2 delete-nat-gateway --nat-gateway-id $NGW --region $AWS_REGION 2>/dev/null
done
if [ -n "$NGWS" ]; then
    echo "  ⏳ Waiting for NAT Gateways to delete..."
    sleep 60
fi
echo "  ✅ NAT Gateways deleted"
echo ""

# 7. Release Elastic IPs with project tag
echo "7️⃣  Releasing Elastic IPs with project tag..."
EIPS=$(aws ec2 describe-addresses --region $AWS_REGION \
    --filters "Name=tag:$PROJECT_TAG,Values=$PROJECT_VALUE" \
    --query 'Addresses[].AllocationId' --output text 2>/dev/null)
for EIP in $EIPS; do
    echo "  🗑️  Releasing EIP: $EIP"
    aws ec2 release-address --allocation-id $EIP --region $AWS_REGION 2>/dev/null
done
echo "  ✅ EIPs released"
echo ""

# 8. Delete Network Interfaces with project tag
echo "8️⃣  Deleting Network Interfaces with project tag..."
ENIS=$(aws ec2 describe-network-interfaces --region $AWS_REGION \
    --filters "Name=tag:$PROJECT_TAG,Values=$PROJECT_VALUE" "Name=status,Values=available" \
    --query 'NetworkInterfaces[].NetworkInterfaceId' --output text 2>/dev/null)
for ENI in $ENIS; do
    echo "  🗑️  Deleting ENI: $ENI"
    aws ec2 delete-network-interface --network-interface-id $ENI --region $AWS_REGION 2>/dev/null
done
echo "  ✅ ENIs deleted"
echo ""

# 9. Delete VPCs with project tag and all dependencies
echo "9️⃣  Deleting VPCs with project tag..."
VPCS=$(aws ec2 describe-vpcs --region $AWS_REGION \
    --filters "Name=tag:$PROJECT_TAG,Values=$PROJECT_VALUE" \
    --query 'Vpcs[].VpcId' --output text 2>/dev/null)

# Also check for VPCs without tags but with "nt114" in the name tag
VPCS_BY_NAME=$(aws ec2 describe-vpcs --region $AWS_REGION \
    --filters "Name=tag:Name,Values=*nt114*" \
    --query 'Vpcs[].VpcId' --output text 2>/dev/null)
VPCS="$VPCS $VPCS_BY_NAME"

for VPC in $VPCS; do
    if [ -z "$VPC" ]; then
        continue
    fi

    echo "  🗑️  Processing VPC: $VPC"

    # Delete VPC Endpoints
    echo "    - Deleting VPC Endpoints..."
    ENDPOINTS=$(aws ec2 describe-vpc-endpoints --region $AWS_REGION --filters "Name=vpc-id,Values=$VPC" --query 'VpcEndpoints[].VpcEndpointId' --output text 2>/dev/null)
    for EP in $ENDPOINTS; do
        echo "      Deleting endpoint: $EP"
        aws ec2 delete-vpc-endpoints --vpc-endpoint-ids $EP --region $AWS_REGION 2>/dev/null
    done

    # Delete NAT Gateways in this VPC (if not already deleted)
    echo "    - Checking for remaining NAT Gateways..."
    VPC_NGWS=$(aws ec2 describe-nat-gateways --region $AWS_REGION \
        --filter "Name=vpc-id,Values=$VPC" "Name=state,Values=available,pending,deleting" \
        --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null)
    for NGW in $VPC_NGWS; do
        echo "      Deleting NAT Gateway: $NGW"
        aws ec2 delete-nat-gateway --nat-gateway-id $NGW --region $AWS_REGION 2>/dev/null
    done

    if [ -n "$VPC_NGWS" ]; then
        echo "      Waiting 30s for NAT Gateways to start deleting..."
        sleep 30
    fi

    # Detach and delete Internet Gateways
    echo "    - Deleting Internet Gateways..."
    IGWS=$(aws ec2 describe-internet-gateways --region $AWS_REGION --filters "Name=attachment.vpc-id,Values=$VPC" --query 'InternetGateways[].InternetGatewayId' --output text 2>/dev/null)
    for IGW in $IGWS; do
        echo "      Detaching and deleting IGW: $IGW"
        aws ec2 detach-internet-gateway --internet-gateway-id $IGW --vpc-id $VPC --region $AWS_REGION 2>/dev/null
        aws ec2 delete-internet-gateway --internet-gateway-id $IGW --region $AWS_REGION 2>/dev/null
    done

    # Delete subnets
    echo "    - Deleting Subnets..."
    SUBNETS=$(aws ec2 describe-subnets --region $AWS_REGION --filters "Name=vpc-id,Values=$VPC" --query 'Subnets[].SubnetId' --output text 2>/dev/null)
    for SUBNET in $SUBNETS; do
        echo "      Deleting subnet: $SUBNET"
        aws ec2 delete-subnet --subnet-id $SUBNET --region $AWS_REGION 2>/dev/null
    done

    # Delete route tables - disassociate first, then delete
    echo "    - Deleting Route Tables..."
    RTS=$(aws ec2 describe-route-tables --region $AWS_REGION \
        --filters "Name=vpc-id,Values=$VPC" \
        --query 'RouteTables[].RouteTableId' --output text 2>/dev/null)

    for RT in $RTS; do
        # Check if it's the main route table
        IS_MAIN=$(aws ec2 describe-route-tables --region $AWS_REGION \
            --route-table-ids $RT \
            --query 'RouteTables[0].Associations[?Main==`true`] | length(@)' --output text 2>/dev/null)

        if [ "$IS_MAIN" = "0" ]; then
            echo "      Processing route table: $RT"

            # Disassociate from subnets
            ASSOCIATIONS=$(aws ec2 describe-route-tables --region $AWS_REGION \
                --route-table-ids $RT \
                --query 'RouteTables[0].Associations[?SubnetId!=`null`].RouteTableAssociationId' \
                --output text 2>/dev/null)

            for ASSOC in $ASSOCIATIONS; do
                echo "        Disassociating: $ASSOC"
                aws ec2 disassociate-route-table --association-id $ASSOC --region $AWS_REGION 2>/dev/null
            done

            # Delete the route table
            echo "        Deleting route table: $RT"
            aws ec2 delete-route-table --route-table-id $RT --region $AWS_REGION 2>/dev/null
        else
            echo "      Skipping main route table: $RT"
        fi
    done

    # Delete Network ACLs (except default)
    echo "    - Deleting Network ACLs..."
    ACLS=$(aws ec2 describe-network-acls --region $AWS_REGION \
        --filters "Name=vpc-id,Values=$VPC" \
        --query 'NetworkAcls[?IsDefault==`false`].NetworkAclId' --output text 2>/dev/null)
    for ACL in $ACLS; do
        echo "      Deleting ACL: $ACL"
        aws ec2 delete-network-acl --network-acl-id $ACL --region $AWS_REGION 2>/dev/null
    done

    # Delete Security Groups (except default) - with retry
    echo "    - Deleting Security Groups..."
    for attempt in 1 2 3; do
        SGS=$(aws ec2 describe-security-groups --region $AWS_REGION \
            --filters "Name=vpc-id,Values=$VPC" \
            --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text 2>/dev/null)

        if [ -z "$SGS" ]; then
            echo "      No more security groups to delete"
            break
        fi

        echo "      Attempt $attempt - Found $(echo $SGS | wc -w) security groups"

        # Remove all rules first
        for SG in $SGS; do
            echo "        Removing rules from: $SG"
            # Remove ingress rules
            INGRESS=$(aws ec2 describe-security-groups --group-ids $SG --region $AWS_REGION \
                --query 'SecurityGroups[0].IpPermissions' 2>/dev/null)
            if [ "$INGRESS" != "[]" ] && [ "$INGRESS" != "null" ]; then
                aws ec2 revoke-security-group-ingress --group-id $SG \
                    --ip-permissions "$INGRESS" --region $AWS_REGION 2>/dev/null
            fi

            # Remove egress rules
            EGRESS=$(aws ec2 describe-security-groups --group-ids $SG --region $AWS_REGION \
                --query 'SecurityGroups[0].IpPermissionsEgress' 2>/dev/null)
            if [ "$EGRESS" != "[]" ] && [ "$EGRESS" != "null" ]; then
                aws ec2 revoke-security-group-egress --group-id $SG \
                    --ip-permissions "$EGRESS" --region $AWS_REGION 2>/dev/null
            fi
        done

        # Try to delete security groups
        for SG in $SGS; do
            echo "        Deleting security group: $SG"
            aws ec2 delete-security-group --group-id $SG --region $AWS_REGION 2>/dev/null
        done

        # Wait before retry
        if [ $attempt -lt 3 ]; then
            echo "      Waiting 10s before retry..."
            sleep 10
        fi
    done

    # Final VPC deletion attempt
    echo "    - Attempting to delete VPC: $VPC"
    if aws ec2 delete-vpc --vpc-id $VPC --region $AWS_REGION 2>&1; then
        echo "  ✅ VPC $VPC deleted successfully"
    else
        echo "  ⚠️  VPC $VPC deletion failed - may have remaining dependencies"
        echo "      Check console for remaining resources"
    fi
done
echo ""

# 10. Delete IAM Roles with project tag or specific names
echo "🔟 Deleting IAM Roles..."
ROLES=$(aws iam list-roles --query 'Roles[?contains(RoleName, `nt114`) || contains(RoleName, `NT114`)].RoleName' --output text 2>/dev/null)
for ROLE in $ROLES; do
    TAGS=$(aws iam list-role-tags --role-name $ROLE --query 'Tags' --output json 2>/dev/null)
    if has_project_tag "$TAGS" || echo "$ROLE" | grep -qi "nt114"; then
        echo "  🗑️  Deleting Role: $ROLE"

        # Detach managed policies
        POLICIES=$(aws iam list-attached-role-policies --role-name $ROLE --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null)
        for POLICY in $POLICIES; do
            aws iam detach-role-policy --role-name $ROLE --policy-arn $POLICY 2>/dev/null
        done

        # Delete inline policies
        INLINE=$(aws iam list-role-policies --role-name $ROLE --query 'PolicyNames[]' --output text 2>/dev/null)
        for POL in $INLINE; do
            aws iam delete-role-policy --role-name $ROLE --policy-name $POL 2>/dev/null
        done

        # Delete instance profiles
        PROFILES=$(aws iam list-instance-profiles-for-role --role-name $ROLE --query 'InstanceProfiles[].InstanceProfileName' --output text 2>/dev/null)
        for PROFILE in $PROFILES; do
            aws iam remove-role-from-instance-profile --instance-profile-name $PROFILE --role-name $ROLE 2>/dev/null
            aws iam delete-instance-profile --instance-profile-name $PROFILE 2>/dev/null
        done

        # Delete role
        aws iam delete-role --role-name $ROLE 2>/dev/null
    fi
done
echo "  ✅ IAM Roles deleted"
echo ""

# 11. Delete EBS Volumes with project tag
echo "1️⃣1️⃣  Deleting EBS Volumes with project tag..."
VOLUMES=$(aws ec2 describe-volumes --region $AWS_REGION \
    --filters "Name=tag:$PROJECT_TAG,Values=$PROJECT_VALUE" "Name=status,Values=available" \
    --query 'Volumes[].VolumeId' --output text 2>/dev/null)
for VOL in $VOLUMES; do
    echo "  🗑️  Deleting Volume: $VOL"
    aws ec2 delete-volume --volume-id $VOL --region $AWS_REGION 2>/dev/null
done
echo "  ✅ Volumes deleted"
echo ""

# 12. Delete CloudWatch Log Groups
echo "1️⃣2️⃣  Deleting CloudWatch Log Groups..."
LOG_GROUPS=$(aws logs describe-log-groups --region $AWS_REGION --query 'logGroups[?contains(logGroupName, `/aws/eks`) || contains(logGroupName, `nt114`) || contains(logGroupName, `NT114`)].logGroupName' --output text 2>/dev/null)
for LG in $LOG_GROUPS; do
    echo "  🗑️  Deleting Log Group: $LG"
    aws logs delete-log-group --log-group-name $LG --region $AWS_REGION 2>/dev/null
done
echo "  ✅ Log Groups deleted"
echo ""

# 13. Delete ECR Repositories with project tag or specific names
echo "1️⃣3️⃣  Deleting ECR Repositories..."
ECR_REPOS=$(aws ecr describe-repositories --region $AWS_REGION --query 'repositories[?contains(repositoryName, `nt114`) || contains(repositoryName, `NT114`)].repositoryName' --output text 2>/dev/null)
for REPO in $ECR_REPOS; do
    echo "  🗑️  Deleting ECR Repository: $REPO"
    aws ecr delete-repository --repository-name $REPO --region $AWS_REGION --force 2>/dev/null
done
echo "  ✅ ECR Repositories deleted"
echo ""

# 14. Delete CloudFormation Stacks with project tag
echo "1️⃣4️⃣  Deleting CloudFormation Stacks..."
STACKS=$(aws cloudformation list-stacks --region $AWS_REGION --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query 'StackSummaries[].StackName' --output text 2>/dev/null)
for STACK in $STACKS; do
    TAGS=$(aws cloudformation describe-stacks --stack-name $STACK --region $AWS_REGION --query 'Stacks[0].Tags' --output json 2>/dev/null)
    if has_project_tag "$TAGS" || echo "$STACK" | grep -qi "nt114"; then
        echo "  🗑️  Deleting Stack: $STACK"
        aws cloudformation delete-stack --stack-name $STACK --region $AWS_REGION 2>/dev/null
    fi
done
echo "  ✅ Stacks deleted"
echo ""

echo "========================================="
echo "✅ CLEANUP COMPLETED!"
echo "========================================="
echo ""
echo "All AWS resources with tag $PROJECT_TAG=$PROJECT_VALUE have been deleted."
echo "Note: Some resources may take a few minutes to fully delete."
echo ""
echo "Resources deleted:"
echo "  ✅ EKS Clusters & Node Groups"
echo "  ✅ Load Balancers (ALB & Classic)"
echo "  ✅ EC2 Instances"
echo "  ✅ Auto Scaling Groups"
echo "  ✅ Launch Templates"
echo "  ✅ NAT Gateways"
echo "  ✅ Elastic IPs"
echo "  ✅ Network Interfaces"
echo "  ✅ VPCs and all components"
echo "  ✅ IAM Roles"
echo "  ✅ EBS Volumes"
echo "  ✅ CloudWatch Log Groups"
echo "  ✅ ECR Repositories"
echo "  ✅ CloudFormation Stacks"
echo ""
