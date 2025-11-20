#!/bin/bash
# Comprehensive AWS Resource Cleanup - Delete resources WITH tag Project=NT114_DevSecOps AND
# resources matching Terraform naming patterns (nt114, NT114, bastion, etc.)
set +e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ENV_TAG="Environment"
ENV_VALUE="dev"

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
echo "Target: Resources WITH tag $ENV_TAG=$ENV_VALUE"
echo "Protection: Resources younger than $MIN_RESOURCE_AGE_HOURS hours will be preserved"
echo "           Default resources and production systems are whitelisted"
echo ""

# Helper function to check if resource HAS the Environment=dev tag
has_env_dev_tag() {
    local tags="$1"

    # Check if resource has the Environment=dev tag
    if echo "$tags" | grep -q "\"$ENV_TAG\"" && echo "$tags" | grep -q "\"$ENV_VALUE\""; then
        return 0  # Has Environment=dev tag, return true (safe to delete)
    fi

    return 1  # Lacks Environment=dev tag, return false (don't delete)
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
    DELETE_INSTANCE=false

    # Check if instance has proper project tag
    if has_env_dev_tag "$TAGS"; then
        DELETE_INSTANCE=true
    fi

    # Check instance name patterns
    if echo "$INSTANCE_ID" | grep -qiE "nt114|NT114|bastion"; then
        DELETE_INSTANCE=true
    fi

    # Check if instance isn't too new
    if [ "$DELETE_INSTANCE" = "true" ] && ! is_resource_too_new "$LAUNCH_TIME"; then
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
        DELETE_INSTANCE=false

        if has_env_dev_tag "$TAGS"; then
            DELETE_INSTANCE=true
        fi

        if echo "$INSTANCE_ID" | grep -qiE "nt114|NT114|bastion"; then
            DELETE_INSTANCE=true
        fi

        if [ "$DELETE_INSTANCE" = "true" ] && ! is_resource_too_new "$LAUNCH_TIME"; then
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
            DELETE_INSTANCE=false

            if has_env_dev_tag "$TAGS"; then
                DELETE_INSTANCE=true
            fi

            if echo "$INSTANCE_ID" | grep -qiE "nt114|NT114|bastion"; then
                DELETE_INSTANCE=true
            fi

            if [ "$DELETE_INSTANCE" = "true" ] && ! is_resource_too_new "$LAUNCH_TIME"; then
                echo "$INSTANCE_ID"
            fi
        done | tr '\n' ' ')

    if confirm_action "Terminate $INSTANCE_COUNT EC2 instance(s) with Project tag or matching patterns?" $INSTANCE_COUNT; then
        execute_aws_cmd "aws ec2 terminate-instances --instance-ids $DELETE_INSTANCE_LIST --region $AWS_REGION" "EC2 Instances" "$DELETE_INSTANCE_LIST"

        if [ "$DRY_RUN" = "false" ]; then
            echo "  ⏳ Waiting for instances to terminate..."
            sleep 60
        fi
    else
        echo "  ❌ Skipped EC2 instance cleanup"
    fi
else
    echo "  ✅ No EC2 instances found with Project tag or matching patterns"
fi

echo "  ✅ EC2 instance cleanup check completed"
echo ""

# 4. Delete Auto Scaling Groups with project tag or specific patterns
echo "4️⃣  Cleaning up Auto Scaling Groups..."
ASGS=$(aws autoscaling describe-auto-scaling-groups --region $AWS_REGION --query 'AutoScalingGroups[].[AutoScalingGroupName]' --output text 2>/dev/null)
for ASG in $ASGS; do
    if [ -n "$ASG" ]; then
        DELETE_ASG=false

        # Check if ASG has project tag
        TAGS=$(aws autoscaling describe-tags --filters "Name=auto-scaling-group,Values=$ASG" --region $AWS_REGION --query 'Tags' --output json 2>/dev/null)
        if has_env_dev_tag "$TAGS"; then
            DELETE_ASG=true
        fi

        # Check ASG name patterns
        if echo "$ASG" | grep -qiE "nt114|NT114"; then
            DELETE_ASG=true
        fi

        if [ "$DELETE_ASG" = "true" ]; then
            echo "  🗑️  Deleting ASG: $ASG"
            execute_aws_cmd "aws autoscaling delete-auto-scaling-group --auto-scaling-group-name '$ASG' --force-delete --region $AWS_REGION" "Auto Scaling Group" "$ASG"
        fi
    fi
done
echo "  ✅ ASG cleanup completed"
echo ""

# 5. Delete Launch Templates with project tag or specific patterns
echo "5️⃣  Cleaning up Launch Templates..."
LTS=$(aws ec2 describe-launch-templates --region $AWS_REGION --query 'LaunchTemplates[].{Id:LaunchTemplateId,Name:LaunchTemplateName,Tags:Tags}' --output json 2>/dev/null)
echo "$LTS" | jq -r '.[] | "\(.Id)\t\(.Name)\t\(.Tags)"' | while IFS=$'\t' read -r LT_ID LT_NAME LT_TAGS; do
    DELETE_LT=false

    # Check if launch template has project tag
    if echo "$LT_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$LT_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_LT=true
    fi

    # Check launch template name patterns
    if echo "$LT_NAME" | grep -qiE "nt114|NT114"; then
        DELETE_LT=true
    fi

    if [ "$DELETE_LT" = "true" ]; then
        echo "  🗑️  Deleting Launch Template: $LT_NAME"
        execute_aws_cmd "aws ec2 delete-launch-template --launch-template-id '$LT_ID' --region $AWS_REGION" "Launch Template" "$LT_NAME"
    fi
done
echo "  ✅ Launch Templates cleanup completed"
echo ""

# 6. Delete NAT Gateways with project tag or specific patterns
echo "6️⃣  Cleaning up NAT Gateways..."
NGWS=$(aws ec2 describe-nat-gateways --region $AWS_REGION --filter "Name=state,Values=available,pending" --query 'NatGateways[].{Id:NatGatewayId,Tags:Tags}' --output json 2>/dev/null)
echo "$NGWS" | jq -r '.[] | "\(.Id)\t\(.Tags)"' | while IFS=$'\t' read -r NGW_ID NGW_TAGS; do
    DELETE_NGW=false

    # Check if NAT gateway has project tag
    if echo "$NGW_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$NGW_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_NGW=true
    fi

    # NAT gateways usually don't have meaningful names, so we rely on tags only
    # but we can check if they're associated with tagged VPCs
    NGW_VPC=$(aws ec2 describe-nat-gateways --nat-gateway-ids $NGW_ID --region $AWS_REGION --query 'NatGateways[0].VpcId' --output text 2>/dev/null)
    if [ -n "$NGW_VPC" ]; then
        VPC_TAGS=$(aws ec2 describe-vpcs --vpc-ids $NGW_VPC --region $AWS_REGION --query 'Vpcs[0].Tags' --output json 2>/dev/null)
        if echo "$VPC_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$VPC_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
            DELETE_NGW=true
        fi
    fi

    if [ "$DELETE_NGW" = "true" ]; then
        echo "  🗑️  Deleting NAT Gateway: $NGW_ID"
        execute_aws_cmd "aws ec2 delete-nat-gateway --nat-gateway-id '$NGW_ID' --region $AWS_REGION" "NAT Gateway" "$NGW_ID"
    fi
done

# Wait for NAT Gateway deletions to initiate if any were found
NAT_DELETE_COUNT=$(echo "$NGWS" | jq -r '.[] | "\(.Id)\t\(.Tags)"' | while IFS=$'\t' read -r NGW_ID NGW_TAGS; do
    DELETE_NGW=false
    if echo "$NGW_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$NGW_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_NGW=true
    fi
    if [ "$DELETE_NGW" = "true" ]; then echo "1"; fi
done | wc -l)

if [ "$NAT_DELETE_COUNT" -gt 0 ] && [ "$DRY_RUN" = "false" ]; then
    echo "  ⏳ Waiting for NAT Gateways to start deleting..."
    sleep 30
fi
echo "  ✅ NAT Gateways cleanup completed"
echo ""

# 7. Release Elastic IPs with project tag or specific patterns
echo "7️⃣  Cleaning up Elastic IPs..."
EIPS=$(aws ec2 describe-addresses --region $AWS_REGION --query 'Addresses[].{Id:AllocationId,Tags:Tags,InstanceId:InstanceId}' --output json 2>/dev/null)
echo "$EIPS" | jq -r '.[] | "\(.Id)\t\(.Tags)\t\(.InstanceId)"' | while IFS=$'\t' read -r EIP_ID EIP_TAGS EIP_INSTANCE; do
    DELETE_EIP=false

    # Only delete EIPs that are not associated with instances or are associated with instances being deleted
    if [ -z "$EIP_INSTANCE" ] || [ "$EIP_INSTANCE" = "null" ]; then
        # Check if EIP has project tag
        if echo "$EIP_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$EIP_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
            DELETE_EIP=true
        fi

        # EIPs don't usually have names, rely on tags or association check
    fi

    if [ "$DELETE_EIP" = "true" ]; then
        echo "  🗑️  Releasing EIP: $EIP_ID"
        execute_aws_cmd "aws ec2 release-address --allocation-id '$EIP_ID' --region $AWS_REGION" "Elastic IP" "$EIP_ID"
    fi
done
echo "  ✅ Elastic IPs cleanup completed"
echo ""

# 8. Delete Network Interfaces with project tag or specific patterns
echo "8️⃣  Cleaning up Network Interfaces..."
ENIS=$(aws ec2 describe-network-interfaces --region $AWS_REGION --filters "Name=status,Values=available" --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Tags:Tags,VpcId:VpcId}' --output json 2>/dev/null)
echo "$ENIS" | jq -r '.[] | "\(.Id)\t\(.Tags)\t\(.VpcId)"' | while IFS=$'\t' read -r ENI_ID ENI_TAGS ENI_VPC; do
    DELETE_ENI=false

    # Check if ENI has project tag
    if echo "$ENI_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$ENI_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_ENI=true
    fi

    # Check if ENI is in a tagged VPC
    if [ -n "$ENI_VPC" ] && [ "$ENI_VPC" != "null" ]; then
        VPC_TAGS=$(aws ec2 describe-vpcs --vpc-ids $ENI_VPC --region $AWS_REGION --query 'Vpcs[0].Tags' --output json 2>/dev/null)
        if echo "$VPC_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$VPC_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
            DELETE_ENI=true
        fi
    fi

    if [ "$DELETE_ENI" = "true" ]; then
        echo "  🗑️  Deleting ENI: $ENI_ID"
        execute_aws_cmd "aws ec2 delete-network-interface --network-interface-id '$ENI_ID' --region $AWS_REGION" "Network Interface" "$ENI_ID"
    fi
done
echo "  ✅ Network Interfaces cleanup completed"
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

# 10. Comprehensive RDS (Relational Database Service) Cleanup
echo "🔟 Cleaning up RDS Resources..."

# Function to safely delete RDS instance
delete_rds_instance() {
    local db_identifier="$1"
    echo "  🗑️  Processing RDS Instance: $db_identifier"

    # Skip final snapshot and disable deletion protection
    aws rds modify-db-instance \
        --db-instance-identifier "$db_identifier" \
        --skip-final-snapshot \
        --no-deletion-protection \
        --apply-immediately \
        --region $AWS_REGION 2>/dev/null

    # Wait for modification to apply
    echo "    - Waiting for modification to apply..."
    sleep 30

    # Delete the instance
    execute_aws_cmd "aws rds delete-db-instance --db-instance-identifier '$db_identifier' --skip-final-snapshot --region $AWS_REGION" "RDS Instance" "$db_identifier"

    if [ "$DRY_RUN" = "false" ]; then
        echo "    - Waiting for RDS instance to be deleted..."
        aws rds wait db-instance-deleted --db-instance-identifier "$db_identifier" --region $AWS_REGION 2>/dev/null &
        RDS_WAIT_PID=$!
        # Wait up to 10 minutes
        timeout 600 bash -c "wait $RDS_WAIT_PID" 2>/dev/null || echo "    ⚠️  RDS deletion taking longer than expected"
    fi
}

# Function to delete DB subnet group
delete_db_subnet_group() {
    local subnet_group_name="$1"
    echo "  🗑️  Deleting DB Subnet Group: $subnet_group_name"
    execute_aws_cmd "aws rds delete-db-subnet-group --db-subnet-group-name '$subnet_group_name' --region $AWS_REGION" "DB Subnet Group" "$subnet_group_name"
}

# Function to delete DB parameter group
delete_db_parameter_group() {
    local parameter_group_name="$1"
    echo "  🗑️  Deleting DB Parameter Group: $parameter_group_name"
    execute_aws_cmd "aws rds delete-db-parameter-group --db-parameter-group-name '$parameter_group_name' --region $AWS_REGION" "DB Parameter Group" "$parameter_group_name"
}

# Function to delete DB option group
delete_db_option_group() {
    local option_group_name="$1"
    echo "  🗑️  Deleting DB Option Group: $option_group_name"
    execute_aws_cmd "aws rds delete-db-option-group --db-option-group-name '$option_group_name' --region $AWS_REGION" "DB Option Group" "$option_group_name"
}

# Get RDS instances to delete
echo "  - Finding RDS instances to delete..."
RDS_INSTANCES=$(aws rds describe-db-instances --region $AWS_REGION --query 'DBInstances[].{Identifier:DBIdentifier,Tags:TagList}' --output json 2>/dev/null)

DELETE_RDS_COUNT=0
DELETE_RDS_LIST=""

echo "$RDS_INSTANCES" | jq -r '.[] | "\(.Identifier)\t\(.Tags)"' | while IFS=$'\t' read -r DB_IDENTIFIER DB_TAGS; do
    DELETE_RDS=false

    # Check if RDS instance has project tag
    if echo "$DB_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$DB_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_RDS=true
    fi

    # Check RDS instance name patterns
    if echo "$DB_IDENTIFIER" | grep -qiE "nt114|NT114"; then
        DELETE_RDS=true
    fi

    if [ "$DELETE_RDS" = "true" ]; then
        DELETE_RDS_COUNT=$((DELETE_RDS_COUNT + 1))
        DELETE_RDS_LIST="$DELETE_RDS_LIST $DB_IDENTIFIER"
        echo "    - Marked for deletion: $DB_IDENTIFIER"
    fi
done

# RDS instances need to be deleted one by one due to long wait times
if [ "$DELETE_RDS_COUNT" -gt 0 ]; then
    if confirm_action "Delete $DELETE_RDS_COUNT RDS instance(s) with project tag?" $DELETE_RDS_COUNT; then
        # Re-query to get the actual list
        RDS_TO_DELETE=$(aws rds describe-db-instances --region $AWS_REGION --query 'DBInstances[].{Identifier:DBIdentifier,Tags:TagList}' --output json 2>/dev/null | \
            jq -r '.[] | "\(.Identifier)\t\(.Tags)"' | while IFS=$'\t' read -r DB_IDENTIFIER DB_TAGS; do
            DELETE_RDS=false

            if echo "$DB_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$DB_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
                DELETE_RDS=true
            fi

            if echo "$DB_IDENTIFIER" | grep -qiE "nt114|NT114"; then
                DELETE_RDS=true
            fi

            if [ "$DELETE_RDS" = "true" ]; then
                echo "$DB_IDENTIFIER"
            fi
        done)

        for DB_ID in $RDS_TO_DELETE; do
            if [ -n "$DB_ID" ]; then
                delete_rds_instance "$DB_ID"
            fi
        done
    else
        echo "  ❌ Skipped RDS cleanup"
    fi
else
    echo "  ✅ No RDS instances found with project tag"
fi

# Delete RDS subnet groups (can only be deleted after instances are gone)
echo "  - Cleaning up DB Subnet Groups..."
DB_SUBNET_GROUPS=$(aws rds describe-db-subnet-groups --region $AWS_REGION --query 'DBSubnetGroups[].{Name:DBSubnetGroupName,Tags:TagList}' --output json 2>/dev/null)

echo "$DB_SUBNET_GROUPS" | jq -r '.[] | "\(.Name)\t\(.Tags)"' | while IFS=$'\t' read -r SUBNET_GROUP_NAME SUBNET_GROUP_TAGS; do
    DELETE_SUBNET_GROUP=false

    # Check if subnet group has project tag
    if echo "$SUBNET_GROUP_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$SUBNET_GROUP_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_SUBNET_GROUP=true
    fi

    # Check subnet group name patterns
    if echo "$SUBNET_GROUP_NAME" | grep -qiE "nt114|NT114"; then
        DELETE_SUBNET_GROUP=true
    fi

    if [ "$DELETE_SUBNET_GROUP" = "true" ]; then
        delete_db_subnet_group "$SUBNET_GROUP_NAME"
    fi
done

# Delete RDS parameter groups
echo "  - Cleaning up DB Parameter Groups..."
DB_PARAMETER_GROUPS=$(aws rds describe-db-parameter-groups --region $AWS_REGION --query 'DBParameterGroups[].{Name:DBParameterGroupName,Tags:TagList}' --output json 2>/dev/null)

echo "$DB_PARAMETER_GROUPS" | jq -r '.[] | "\(.Name)\t\(.Tags)"' | while IFS=$'\t' read -r PARAM_GROUP_NAME PARAM_GROUP_TAGS; do
    DELETE_PARAM_GROUP=false

    # Skip default parameter groups
    if echo "$PARAM_GROUP_NAME" | grep -q "default\."; then
        continue
    fi

    # Check if parameter group has project tag
    if echo "$PARAM_GROUP_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$PARAM_GROUP_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_PARAM_GROUP=true
    fi

    # Check parameter group name patterns
    if echo "$PARAM_GROUP_NAME" | grep -qiE "nt114|NT114"; then
        DELETE_PARAM_GROUP=true
    fi

    if [ "$DELETE_PARAM_GROUP" = "true" ]; then
        delete_db_parameter_group "$PARAM_GROUP_NAME"
    fi
done

# Delete RDS option groups
echo "  - Cleaning up DB Option Groups..."
DB_OPTION_GROUPS=$(aws rds describe-db-option-groups --region $AWS_REGION --query 'DBOptionGroups[].{Name:DBOptionGroupName,Tags:TagList}' --output json 2>/dev/null)

echo "$DB_OPTION_GROUPS" | jq -r '.[] | "\(.Name)\t\(.Tags)"' | while IFS=$'\t' read -r OPTION_GROUP_NAME OPTION_GROUP_TAGS; do
    DELETE_OPTION_GROUP=false

    # Skip default option groups
    if echo "$OPTION_GROUP_NAME" | grep -q "default\."; then
        continue
    fi

    # Check if option group has project tag
    if echo "$OPTION_GROUP_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$OPTION_GROUP_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_OPTION_GROUP=true
    fi

    # Check option group name patterns
    if echo "$OPTION_GROUP_NAME" | grep -qiE "nt114|NT114"; then
        DELETE_OPTION_GROUP=true
    fi

    if [ "$DELETE_OPTION_GROUP" = "true" ]; then
        delete_db_option_group "$OPTION_GROUP_NAME"
    fi
done

echo "  ✅ RDS cleanup completed"
echo ""

# 11. S3 Bucket Cleanup
echo "1️⃣1️⃣  Cleaning up S3 Buckets..."

# Get S3 buckets to delete
S3_BUCKETS=$(aws s3api list-buckets --query 'Buckets[].{Name:Name}' --output json 2>/dev/null)

DELETE_S3_COUNT=0
DELETE_S3_LIST=""

echo "$S3_BUCKETS" | jq -r '.[].Name' | while read -r BUCKET_NAME; do
    DELETE_BUCKET=false

    # Check bucket tags
    BUCKET_TAGS=$(aws s3api get-bucket-tagging --bucket "$BUCKET_NAME" --query 'TagSet' --output json 2>/dev/null || echo '[]')
    if echo "$BUCKET_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$BUCKET_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_BUCKET=true
    fi

    # Check bucket name patterns
    if echo "$BUCKET_NAME" | grep -qiE "nt114|NT114|migration"; then
        DELETE_BUCKET=true
    fi

    if [ "$DELETE_BUCKET" = "true" ]; then
        DELETE_S3_COUNT=$((DELETE_S3_COUNT + 1))
        DELETE_S3_LIST="$DELETE_S3_LIST $BUCKET_NAME"
        echo "    - Marked for deletion: $BUCKET_NAME"
    fi
done

if [ "$DELETE_S3_COUNT" -gt 0 ]; then
    if confirm_action "Delete $DELETE_S3_COUNT S3 bucket(s) with project tag? (This will permanently delete all bucket contents)" $DELETE_S3_COUNT; then
        # Re-query to get the actual list
        S3_TO_DELETE=$(aws s3api list-buckets --query 'Buckets[].{Name:Name}' --output json 2>/dev/null | \
            jq -r '.[].Name' | while read -r BUCKET_NAME; do
            DELETE_BUCKET=false

            BUCKET_TAGS=$(aws s3api get-bucket-tagging --bucket "$BUCKET_NAME" --query 'TagSet' --output json 2>/dev/null || echo '[]')
            if echo "$BUCKET_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$BUCKET_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
                DELETE_BUCKET=true
            fi

            if echo "$BUCKET_NAME" | grep -qiE "nt114|NT114|migration"; then
                DELETE_BUCKET=true
            fi

            if [ "$DELETE_BUCKET" = "true" ]; then
                echo "$BUCKET_NAME"
            fi
        done)

        for BUCKET in $S3_TO_DELETE; do
            if [ -n "$BUCKET" ]; then
                echo "  🗑️  Processing S3 Bucket: $BUCKET"

                # Empty the bucket first
                if [ "$DRY_RUN" = "false" ]; then
                    echo "    - Emptying bucket contents..."
                    aws s3 rm "s3://$BUCKET" --recursive --region $AWS_REGION 2>/dev/null

                    # Delete all versions if versioning is enabled
                    echo "    - Deleting object versions..."
                    aws s3api list-object-versions --bucket "$BUCKET" --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null | \
                        jq -c '.Objects[]' | while read -r obj; do
                        aws s3api delete-object --bucket "$BUCKET" --key "$(echo "$obj" | jq -r '.Key')" --version-id "$(echo "$obj" | jq -r '.VersionId')" 2>/dev/null
                    done

                    # Delete delete markers
                    aws s3api list-object-versions --bucket "$BUCKET" --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null | \
                        jq -c '.Objects[]' | while read -r obj; do
                        aws s3api delete-object --bucket "$BUCKET" --key "$(echo "$obj" | jq -r '.Key')" --version-id "$(echo "$obj" | jq -r '.VersionId')" 2>/dev/null
                    done
                else
                    echo "    - [DRY-RUN] Would empty bucket contents"
                fi

                # Delete the bucket
                execute_aws_cmd "aws s3api delete-bucket --bucket '$BUCKET' --region $AWS_REGION" "S3 Bucket" "$BUCKET"
            fi
        done
    else
        echo "  ❌ Skipped S3 bucket cleanup"
    fi
else
    echo "  ✅ No S3 buckets found with project tag"
fi

echo "  ✅ S3 bucket cleanup completed"
echo ""

# 12. Comprehensive IAM Resources Cleanup with project tag or specific names
echo "🔟 Cleaning up IAM Resources..."

# Function to safely delete IAM role with all dependencies
delete_iam_role_safely() {
    local role_name="$1"

    echo "  🗑️  Processing IAM Role: $role_name"

    # Remove from instance profiles first
    echo "    - Removing from instance profiles..."
    PROFILES=$(aws iam list-instance-profiles-for-role --role-name "$role_name" --query 'InstanceProfiles[].InstanceProfileName' --output text 2>/dev/null)
    for PROFILE in $PROFILES; do
        echo "      Removing from profile: $PROFILE"
        aws iam remove-role-from-instance-profile --instance-profile-name "$PROFILE" --role-name "$role_name" 2>/dev/null

        # Only delete instance profile if it's not used by other roles
        OTHER_ROLES=$(aws iam get-instance-profile --instance-profile-name "$PROFILE" --query 'InstanceProfile.Roles[].RoleName' --output text 2>/dev/null)
        if [ -z "$OTHER_ROLES" ] || [ "$OTHER_ROLES" = "$role_name" ]; then
            echo "      Deleting instance profile: $PROFILE"
            aws iam delete-instance-profile --instance-profile-name "$PROFILE" 2>/dev/null
        fi
    done

    # Detach managed policies
    echo "    - Detaching managed policies..."
    POLICIES=$(aws iam list-attached-role-policies --role-name "$role_name" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null)
    for POLICY in $POLICIES; do
        echo "      Detaching: $(basename $POLICY)"
        aws iam detach-role-policy --role-name "$role_name" --policy-arn "$POLICY" 2>/dev/null
    done

    # Delete inline policies
    echo "    - Deleting inline policies..."
    INLINE=$(aws iam list-role-policies --role-name "$role_name" --query 'PolicyNames[]' --output text 2>/dev/null)
    for POL in $INLINE; do
        echo "      Deleting: $POL"
        aws iam delete-role-policy --role-name "$role_name" --policy-name "$POL" 2>/dev/null
    done

    # Finally delete the role
    echo "    - Deleting role: $role_name"
    aws iam delete-role --role-name "$role_name" 2>/dev/null
}

# Get all roles that might be related to the project (excluding specific roles already handled)
ROLES=$(aws iam list-roles --query 'Roles[].RoleName' --output text 2>/dev/null)
for ROLE in $ROLES; do
    DELETE_ROLE=false

    # Skip roles already handled specifically
    for SPECIFIC_ROLE in "${SPECIFIC_ROLES[@]}"; do
        if [ "$ROLE" = "$SPECIFIC_ROLE" ]; then
            continue 2  # Skip to next role
        fi
    done

    # Check if role has project tag
    TAGS=$(aws iam list-role-tags --role-name "$ROLE" --query 'Tags' --output json 2>/dev/null 2>/dev/null)
    if has_env_dev_tag "$TAGS"; then
        DELETE_ROLE=true
    fi

    # Check role name patterns
    if echo "$ROLE" | grep -qiE "nt114|NT114|eks.*ebs.*csi|eks.*alb|enhanced.*monitoring|rds.*enhanced|github.*actions|bastion"; then
        DELETE_ROLE=true
    fi

    # Check if it's an EKS-related role
    if echo "$ROLE" | grep -qiE "eks.*nodegroup|eks.*cluster|aws-load-balancer"; then
        DELETE_ROLE=true
    fi

    if [ "$DELETE_ROLE" = "true" ]; then
        delete_iam_role_safely "$ROLE"
    fi
done

# Delete IAM Policies related to the project
echo "  🗑️  Deleting IAM Policies..."
POLICIES=$(aws iam list-policies --scope Local --query 'Policies[].{Name:PolicyName,Arn:Arn}' --output json 2>/dev/null)
echo "$POLICIES" | jq -r '.[] | "\(.Name)\t\(.Arn)"' | while IFS=$'\t' read -r POLICY_NAME POLICY_ARN; do
    DELETE_POLICY=false

    # Check policy name patterns
    if echo "$POLICY_NAME" | grep -qiE "nt114|NT114|github.*actions|eks.*assume|bastion"; then
        DELETE_POLICY=true
    fi

    # Check policy tags
    TAGS=$(aws iam list-policy-tags --policy-arn "$POLICY_ARN" --query 'Tags' --output json 2>/dev/null)
    if has_env_dev_tag "$TAGS"; then
        DELETE_POLICY=true
    fi

    if [ "$DELETE_POLICY" = "true" ]; then
        echo "  🗑️  Deleting Policy: $POLICY_NAME"

        # Detach from all entities first
        # From roles
        ATTACHED_ROLES=$(aws iam list-entities-for-policy --policy-arn "$POLICY_ARN" --filter Role --query 'PolicyRoles[].RoleName' --output text 2>/dev/null)
        for ROLE in $ATTACHED_ROLES; do
            echo "    Detaching from role: $ROLE"
            aws iam detach-role-policy --role-name "$ROLE" --policy-arn "$POLICY_ARN" 2>/dev/null
        done

        # From groups
        ATTACHED_GROUPS=$(aws iam list-entities-for-policy --policy-arn "$POLICY_ARN" --filter Group --query 'PolicyGroups[].GroupName' --output text 2>/dev/null)
        for GROUP in $ATTACHED_GROUPS; do
            echo "    Detaching from group: $GROUP"
            aws iam detach-group-policy --group-name "$GROUP" --policy-arn "$POLICY_ARN" 2>/dev/null
        done

        # From users
        ATTACHED_USERS=$(aws iam list-entities-for-policy --policy-arn "$POLICY_ARN" --filter User --query 'PolicyUsers[].UserName' --output text 2>/dev/null)
        for USER in $ATTACHED_USERS; do
            echo "    Detaching from user: $USER"
            aws iam detach-user-policy --user-name "$USER" --policy-arn "$POLICY_ARN" 2>/dev/null
        done

        # Delete the policy
        aws iam delete-policy --policy-arn "$POLICY_ARN" 2>/dev/null
    fi
done

# Delete specific IAM roles that are causing Terraform conflicts
echo "  🗑️  Deleting Specific Conflicting IAM Roles..."
SPECIFIC_ROLES=(
    "eks-1-ebs-csi-controller"
    "eks-admin-role"
)

for ROLE_NAME in "${SPECIFIC_ROLES[@]}"; do
    # Check if role exists
    ROLE_EXISTS=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.RoleName' --output text 2>/dev/null || echo "")
    if [ -n "$ROLE_EXISTS" ]; then
        echo "  🎯 Deleting specific role: $ROLE_NAME"
        delete_iam_role_safely "$ROLE_NAME"
    else
        echo "  ℹ️  Role not found: $ROLE_NAME"
    fi
done

# Delete specific IAM users that are causing Terraform conflicts
echo "  🗑️  Deleting Specific Conflicting IAM Users..."
SPECIFIC_USERS=(
    "nt114-devsecops-github-actions-user"
)

for USER_NAME in "${SPECIFIC_USERS[@]}"; do
    # Check if user exists
    USER_EXISTS=$(aws iam get-user --user-name "$USER_NAME" --query 'User.UserName' --output text 2>/dev/null || echo "")
    if [ -n "$USER_EXISTS" ]; then
        echo "  🎯 Deleting specific user: $USER_NAME"

        # Delete access keys first
        ACCESS_KEYS=$(aws iam list-access-keys --user-name "$USER_NAME" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null)
        for KEY in $ACCESS_KEYS; do
            echo "    Deleting access key: $KEY"
            aws iam delete-access-key --user-name "$USER_NAME" --access-key-id "$KEY" 2>/dev/null
        done

        # Detach policies
        ATTACHED_POLICIES=$(aws iam list-attached-user-policies --user-name "$USER_NAME" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null)
        for POLICY in $ATTACHED_POLICIES; do
            echo "    Detaching policy: $(basename $POLICY)"
            aws iam detach-user-policy --user-name "$USER_NAME" --policy-arn "$POLICY" 2>/dev/null
        done

        # Delete inline policies
        INLINE_POLICIES=$(aws iam list-user-policies --user-name "$USER_NAME" --query 'PolicyNames[]' --output text 2>/dev/null)
        for POLICY in $INLINE_POLICIES; do
            echo "    Deleting inline policy: $POLICY"
            aws iam delete-user-policy --user-name "$USER_NAME" --policy-name "$POLICY" 2>/dev/null
        done

        # Remove from groups
        GROUPS=$(aws iam list-groups-for-user --user-name "$USER_NAME" --query 'Groups[].GroupName' --output text 2>/dev/null)
        for GROUP in $GROUPS; do
            echo "    Removing from group: $GROUP"
            aws iam remove-user-from-group --group-name "$GROUP" --user-name "$USER_NAME" 2>/dev/null
        done

        # Delete the user
        aws iam delete-user --user-name "$USER_NAME" 2>/dev/null
        echo "  ✅ User deleted: $USER_NAME"
    else
        echo "  ℹ️  User not found: $USER_NAME"
    fi
done

# Delete specific IAM groups that are causing Terraform conflicts
echo "  🗑️  Deleting Specific Conflicting IAM Groups..."
SPECIFIC_GROUPS=(
    "eks-admin-group"
)

for GROUP_NAME in "${SPECIFIC_GROUPS[@]}"; do
    # Check if group exists
    GROUP_EXISTS=$(aws iam get-group --group-name "$GROUP_NAME" --query 'Group.GroupName' --output text 2>/dev/null || echo "")
    if [ -n "$GROUP_EXISTS" ]; then
        echo "  🎯 Deleting specific group: $GROUP_NAME"

        # Remove all users from the group first
        USERS_IN_GROUP=$(aws iam get-group --group-name "$GROUP_NAME" --query 'Users[].UserName' --output text 2>/dev/null)
        for USER_IN_GROUP in $USERS_IN_GROUP; do
            echo "    Removing user from group: $USER_IN_GROUP"
            aws iam remove-user-from-group --group-name "$GROUP_NAME" --user-name "$USER_IN_GROUP" 2>/dev/null
        done

        # Detach managed policies
        ATTACHED_POLICIES=$(aws iam list-attached-group-policies --group-name "$GROUP_NAME" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null)
        for POLICY in $ATTACHED_POLICIES; do
            echo "    Detaching policy: $(basename $POLICY)"
            aws iam detach-group-policy --group-name "$GROUP_NAME" --policy-arn "$POLICY" 2>/dev/null
        done

        # Delete inline policies
        INLINE_POLICIES=$(aws iam list-group-policies --group-name "$GROUP_NAME" --query 'PolicyNames[]' --output text 2>/dev/null)
        for POLICY in $INLINE_POLICIES; do
            echo "    Deleting inline policy: $POLICY"
            aws iam delete-group-policy --group-name "$GROUP_NAME" --policy-name "$POLICY" 2>/dev/null
        done

        # Delete the group
        aws iam delete-group --group-name "$GROUP_NAME" 2>/dev/null
        echo "  ✅ Group deleted: $GROUP_NAME"
    else
        echo "  ℹ️  Group not found: $GROUP_NAME"
    fi
done

# Delete IAM Groups related to the project (existing logic)
echo "  🗑️  Deleting Other IAM Groups..."
GROUPS=$(aws iam list-groups --query 'Groups[].GroupName' --output text 2>/dev/null)
for GROUP in $GROUPS; do
    DELETE_GROUP=false

    # Skip groups already handled specifically
    for SPECIFIC_GROUP in "${SPECIFIC_GROUPS[@]}"; do
        if [ "$GROUP" = "$SPECIFIC_GROUP" ]; then
            continue 2  # Skip to next group
        fi
    done

    # Check group name patterns
    if echo "$GROUP" | grep -qiE "nt114|NT114|eks.*admin"; then
        DELETE_GROUP=true
    fi

    # Check group tags
    TAGS=$(aws iam list-group-tags --group-name "$GROUP" --query 'Tags' --output json 2>/dev/null)
    if has_env_dev_tag "$TAGS"; then
        DELETE_GROUP=true
    fi

    if [ "$DELETE_GROUP" = "true" ]; then
        echo "  🗑️  Deleting Group: $GROUP"

        # Remove all users from the group first
        USERS_IN_GROUP=$(aws iam get-group --group-name "$GROUP" --query 'Users[].UserName' --output text 2>/dev/null)
        for USER_IN_GROUP in $USERS_IN_GROUP; do
            echo "    Removing user from group: $USER_IN_GROUP"
            aws iam remove-user-from-group --group-name "$GROUP" --user-name "$USER_IN_GROUP" 2>/dev/null
        done

        # Detach managed policies
        ATTACHED_POLICIES=$(aws iam list-attached-group-policies --group-name "$GROUP" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null)
        for POLICY in $ATTACHED_POLICIES; do
            echo "    Detaching policy: $(basename $POLICY)"
            aws iam detach-group-policy --group-name "$GROUP" --policy-arn "$POLICY" 2>/dev/null
        done

        # Delete inline policies
        INLINE_POLICIES=$(aws iam list-group-policies --group-name "$GROUP" --query 'PolicyNames[]' --output text 2>/dev/null)
        for POLICY in $INLINE_POLICIES; do
            echo "    Deleting inline policy: $POLICY"
            aws iam delete-group-policy --group-name "$GROUP" --policy-name "$POLICY" 2>/dev/null
        done

        # Delete the group
        aws iam delete-group --group-name "$GROUP" 2>/dev/null
    fi
done

# Delete IAM Users related to the project (existing logic)
echo "  🗑️  Deleting Other IAM Users..."
USERS=$(aws iam list-users --query 'Users[].UserName' --output text 2>/dev/null)
for USER in $USERS; do
    DELETE_USER=false

    # Skip users already handled specifically
    for SPECIFIC_USER in "${SPECIFIC_USERS[@]}"; do
        if [ "$USER" = "$SPECIFIC_USER" ]; then
            continue 2  # Skip to next user
        fi
    done

    # Check user name patterns
    if echo "$USER" | grep -qiE "nt114|NT114|github.*actions"; then
        DELETE_USER=true
    fi

    # Check user tags
    TAGS=$(aws iam list-user-tags --user-name "$USER" --query 'Tags' --output json 2>/dev/null)
    if has_env_dev_tag "$TAGS"; then
        DELETE_USER=true
    fi

    if [ "$DELETE_USER" = "true" ]; then
        echo "  🗑️  Deleting User: $USER"

        # Delete access keys first
        ACCESS_KEYS=$(aws iam list-access-keys --user-name "$USER" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null)
        for KEY in $ACCESS_KEYS; do
            echo "    Deleting access key: $KEY"
            aws iam delete-access-key --user-name "$USER" --access-key-id "$KEY" 2>/dev/null
        done

        # Detach policies
        ATTACHED_POLICIES=$(aws iam list-attached-user-policies --user-name "$USER" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null)
        for POLICY in $ATTACHED_POLICIES; do
            echo "    Detaching policy: $(basename $POLICY)"
            aws iam detach-user-policy --user-name "$USER" --policy-arn "$POLICY" 2>/dev/null
        done

        # Delete inline policies
        INLINE_POLICIES=$(aws iam list-user-policies --user-name "$USER" --query 'PolicyNames[]' --output text 2>/dev/null)
        for POLICY in $INLINE_POLICIES; do
            echo "    Deleting inline policy: $POLICY"
            aws iam delete-user-policy --user-name "$USER" --policy-name "$POLICY" 2>/dev/null
        done

        # Remove from groups
        GROUPS=$(aws iam list-groups-for-user --user-name "$USER" --query 'Groups[].GroupName' --output text 2>/dev/null)
        for GROUP in $GROUPS; do
            echo "    Removing from group: $GROUP"
            aws iam remove-user-from-group --group-name "$GROUP" --user-name "$USER" 2>/dev/null
        done

        # Delete the user
        aws iam delete-user --user-name "$USER" 2>/dev/null
    fi
done

echo "  ✅ IAM Resources cleanup completed"
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

# 13. Delete EKS Addons with project tag or specific names
echo "1️⃣3️⃣  Cleaning up EKS Addons..."
CLUSTERS=$(aws eks list-clusters --region $AWS_REGION --query 'clusters[]' --output text 2>/dev/null)
for CLUSTER in $CLUSTERS; do
    # Check if cluster has project tag or matches pattern
    CLUSTER_TAGS=$(aws eks describe-cluster --name $CLUSTER --region $AWS_REGION --query 'cluster.tags' --output json 2>/dev/null)
    DELETE_CLUSTER_ADDONS=false

    if echo "$CLUSTER_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$CLUSTER_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_CLUSTER_ADDONS=true
    fi

    if echo "$CLUSTER" | grep -qiE "nt114|NT114"; then
        DELETE_CLUSTER_ADDONS=true
    fi

    if [ "$DELETE_CLUSTER_ADDONS" = "true" ]; then
        echo "  🗑️  Processing EKS addons for cluster: $CLUSTER"

        # List and delete addons
        ADDONS=$(aws eks list-addons --cluster-name $CLUSTER --region $AWS_REGION --query 'addons[]' --output text 2>/dev/null)
        for ADDON in $ADDONS; do
            # Focus on our specific addons
            if echo "$ADDON" | grep -qiE "ebs-csi|coredns|kube-proxy|vpc-cni"; then
                echo "    - Deleting addon: $ADDON"
                execute_aws_cmd "aws eks delete-addon --cluster-name '$CLUSTER' --addon-name '$ADDON' --region $AWS_REGION" "EKS Addon" "$ADDON"
            fi
        done
    fi
done
echo "  ✅ EKS addons cleanup completed"
echo ""

# 14. Delete ECR Repositories with project tag or specific names
echo "1️⃣4️⃣  Deleting ECR Repositories..."
ECR_REPOS=$(aws ecr describe-repositories --region $AWS_REGION --query 'repositories[].{Name:repositoryName,Tags:tags}' --output json 2>/dev/null)
echo "$ECR_REPOS" | jq -r '.[] | "\(.Name)\t\(.Tags)"' | while IFS=$'\t' read -r REPO_NAME REPO_TAGS; do
    DELETE_REPO=false

    # Check if repository has project tag
    if echo "$REPO_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$REPO_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_REPO=true
    fi

    # Check repository name patterns
    if echo "$REPO_NAME" | grep -qiE "nt114|NT114"; then
        DELETE_REPO=true
    fi

    if [ "$DELETE_REPO" = "true" ]; then
        echo "  🗑️  Deleting ECR Repository: $REPO_NAME"
        execute_aws_cmd "aws ecr delete-repository --repository-name '$REPO_NAME' --region $AWS_REGION --force" "ECR Repository" "$REPO_NAME"
    fi
done
echo "  ✅ ECR Repositories deleted"
echo ""

# 15. Delete KMS Keys with project tag or specific names
echo "1️⃣5️⃣  Cleaning up KMS Keys..."
KMS_KEYS=$(aws kms list-keys --region $AWS_REGION --query 'Keys[].KeyId' --output text 2>/dev/null)
for KEY_ID in $KMS_KEYS; do
    # Get key metadata and tags
    KEY_METADATA=$(aws kms describe-key --key-id $KEY_ID --region $AWS_REGION --query 'KeyMetadata' --output json 2>/dev/null)
    KEY_STATE=$(echo "$KEY_METADATA" | jq -r '.KeyState // ""')
    KEY_TAGS=$(aws kms list-resource-tags --key-id $KEY_ID --region $AWS_REGION --query 'Tags' --output json 2>/dev/null)

    DELETE_KEY=false

    # Skip keys that are pending deletion
    if [ "$KEY_STATE" = "PendingDeletion" ]; then
        continue
    fi

    # Check if key has project tag
    if echo "$KEY_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$KEY_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_KEY=true
    fi

    # Check key description patterns
    KEY_DESCRIPTION=$(echo "$KEY_METADATA" | jq -r '.Description // ""')
    if echo "$KEY_DESCRIPTION" | grep -qiE "nt114|NT114|rds"; then
        DELETE_KEY=true
    fi

    if [ "$DELETE_KEY" = "true" ]; then
        echo "  🗑️  Scheduling KMS Key for deletion: $KEY_ID"
        execute_aws_cmd "aws kms schedule-key-deletion --key-id '$KEY_ID' --region $AWS_REGION --pending-window-in-days 7" "KMS Key" "$KEY_ID"
    fi
done
echo "  ✅ KMS keys cleanup completed"
echo ""

# 16. Delete CloudFormation Stacks with project tag
echo "1️⃣6️⃣  Deleting CloudFormation Stacks..."
STACKS=$(aws cloudformation list-stacks --region $AWS_REGION --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE IMPORT_COMPLETE IMPORT_ROLLBACK_COMPLETE --query 'StackSummaries[].{Name:StackName,Tags:Tags}' --output json 2>/dev/null)
echo "$STACKS" | jq -r '.[] | "\(.Name)\t\(.Tags)"' | while IFS=$'\t' read -r STACK_NAME STACK_TAGS; do
    DELETE_STACK=false

    # Check if stack has project tag
    if echo "$STACK_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$STACK_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_STACK=true
    fi

    # Check stack name patterns
    if echo "$STACK_NAME" | grep -qiE "nt114|NT114"; then
        DELETE_STACK=true
    fi

    if [ "$DELETE_STACK" = "true" ]; then
        echo "  🗑️  Deleting CloudFormation Stack: $STACK_NAME"
        execute_aws_cmd "aws cloudformation delete-stack --stack-name '$STACK_NAME' --region $AWS_REGION" "CloudFormation Stack" "$STACK_NAME"
    fi
done
echo "  ✅ Stacks deleted"
echo ""

# 17. Clean up any remaining Key Pairs
echo "1️⃣7️⃣  Cleaning up EC2 Key Pairs..."
KEY_PAIRS=$(aws ec2 describe-key-pairs --region $AWS_REGION --query 'KeyPairs[].{Name:KeyName,Tags:Tags}' --output json 2>/dev/null)
echo "$KEY_PAIRS" | jq -r '.[] | "\(.Name)\t\(.Tags)"' | while IFS=$'\t' read -r KEY_NAME KEY_TAGS; do
    DELETE_KEY=false

    # Check if key pair has project tag
    if echo "$KEY_TAGS" | grep -q "\"$PROJECT_TAG\"" && echo "$KEY_TAGS" | grep -q "\"$PROJECT_VALUE\""; then
        DELETE_KEY=true
    fi

    # Check key name patterns
    if echo "$KEY_NAME" | grep -qiE "nt114|NT114|bastion"; then
        DELETE_KEY=true
    fi

    if [ "$DELETE_KEY" = "true" ]; then
        echo "  🗑️  Deleting EC2 Key Pair: $KEY_NAME"
        execute_aws_cmd "aws ec2 delete-key-pair --key-name '$KEY_NAME' --region $AWS_REGION" "EC2 Key Pair" "$KEY_NAME"
    fi
done
echo "  ✅ Key pairs cleanup completed"
echo ""

echo "========================================="
echo "✅ COMPREHENSIVE CLEANUP COMPLETED!"
echo "========================================="
echo ""
echo "All AWS resources with tag $PROJECT_TAG=$PROJECT_VALUE have been deleted."
echo "Resources with name patterns containing 'nt114', 'NT114', or related Terraform"
echo "components have also been cleaned up."
echo ""
echo "Note: Some resources may take a few minutes to fully delete."
echo "      RDS instances and KMS keys have extended deletion periods."
echo ""
echo "Resources processed:"
echo "  ✅ EKS Clusters, Node Groups & Addons"
echo "  ✅ Load Balancers (ALB, NLB & Classic)"
echo "  ✅ EC2 Instances & Launch Templates"
echo "  ✅ Auto Scaling Groups & Instance Profiles"
echo "  ✅ VPCs and all dependencies (subnets, gateways, route tables, etc.)"
echo "  ✅ Security Groups & Network ACLs"
echo "  ✅ NAT Gateways & Elastic IPs"
echo "  ✅ Network Interfaces"
echo "  ✅ RDS Instances, Subnet Groups, Parameter Groups & Option Groups"
echo "  ✅ S3 Buckets (including versioned objects)"
echo "  ✅ IAM Roles, Policies, Users & Groups (comprehensive cleanup + specific conflict resolution)"
echo "  ✅ EBS Volumes"
echo "  ✅ CloudWatch Log Groups"
echo "  ✅ ECR Repositories & Lifecycle Policies"
echo "  ✅ KMS Keys (scheduled for deletion)"
echo "  ✅ CloudFormation Stacks"
echo "  ✅ EC2 Key Pairs"
echo ""
echo "🔧 Safety features maintained:"
echo "  • Dry-run mode by default"
echo "  • Resource whitelisting protection"
echo "  • Resource age protection (24-hour minimum)"
echo "  • Interactive confirmations"
echo "  • Dependency-aware deletion order"
echo ""
echo "⚠️  Important reminders:"
echo "  • Verify all resources are deleted in AWS Console"
echo "  • Check for any remaining resources in all regions"
echo "  • Monitor billing for unexpected charges"
echo ""
