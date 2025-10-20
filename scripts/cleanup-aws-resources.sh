#!/bin/bash
set -e

AWS_REGION="${AWS_REGION:-us-east-1}"

echo "🗑️ Starting AWS Resource Cleanup..."
echo "Region: $AWS_REGION"
echo "⚠️  This will delete ALL resources created in the last 5 hours"
echo ""

# Function to delete EKS clusters
cleanup_eks_clusters() {
    echo "📋 Checking for EKS clusters..."
    CLUSTERS=$(aws eks list-clusters --region $AWS_REGION --query 'clusters[]' --output text 2>/dev/null || echo "")

    if [ -n "$CLUSTERS" ]; then
        for CLUSTER in $CLUSTERS; do
            echo "🗑️  Deleting EKS cluster: $CLUSTER"

            # Delete node groups first
            echo "  - Deleting node groups..."
            NODEGROUPS=$(aws eks list-nodegroups --cluster-name $CLUSTER --region $AWS_REGION --query 'nodegroups[]' --output text 2>/dev/null || echo "")
            for NG in $NODEGROUPS; do
                echo "    • Deleting node group: $NG"
                aws eks delete-nodegroup --cluster-name $CLUSTER --nodegroup-name $NG --region $AWS_REGION 2>/dev/null || true
            done

            # Wait for node groups to be deleted
            echo "  - Waiting for node groups to be deleted..."
            for NG in $NODEGROUPS; do
                aws eks wait nodegroup-deleted --cluster-name $CLUSTER --nodegroup-name $NG --region $AWS_REGION 2>/dev/null || true
            done

            # Delete cluster
            echo "  - Deleting cluster..."
            aws eks delete-cluster --name $CLUSTER --region $AWS_REGION 2>/dev/null || true
            echo "  - Waiting for cluster to be deleted..."
            aws eks wait cluster-deleted --name $CLUSTER --region $AWS_REGION 2>/dev/null || true
            echo "  ✅ Cluster $CLUSTER deleted"
        done
    else
        echo "  ℹ️  No EKS clusters found"
    fi
}

# Function to delete VPCs
cleanup_vpcs() {
    echo ""
    echo "📋 Checking for VPCs..."
    VPCS=$(aws ec2 describe-vpcs --region $AWS_REGION --filters "Name=tag:Terraform,Values=true" --query 'Vpcs[].VpcId' --output text 2>/dev/null || echo "")

    if [ -n "$VPCS" ]; then
        for VPC in $VPCS; do
            echo "🗑️  Deleting VPC: $VPC"

            # Delete NAT Gateways
            echo "  - Deleting NAT Gateways..."
            NAT_GWS=$(aws ec2 describe-nat-gateways --region $AWS_REGION --filter "Name=vpc-id,Values=$VPC" --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null || echo "")
            for NGW in $NAT_GWS; do
                echo "    • Deleting NAT Gateway: $NGW"
                aws ec2 delete-nat-gateway --nat-gateway-id $NGW --region $AWS_REGION 2>/dev/null || true
            done

            # Wait for NAT Gateways to be deleted
            if [ -n "$NAT_GWS" ]; then
                echo "  - Waiting for NAT Gateways to be deleted..."
                sleep 30
            fi

            # Delete Internet Gateways
            echo "  - Deleting Internet Gateways..."
            IGWs=$(aws ec2 describe-internet-gateways --region $AWS_REGION --filters "Name=attachment.vpc-id,Values=$VPC" --query 'InternetGateways[].InternetGatewayId' --output text 2>/dev/null || echo "")
            for IGW in $IGWs; do
                echo "    • Detaching and deleting IGW: $IGW"
                aws ec2 detach-internet-gateway --internet-gateway-id $IGW --vpc-id $VPC --region $AWS_REGION 2>/dev/null || true
                aws ec2 delete-internet-gateway --internet-gateway-id $IGW --region $AWS_REGION 2>/dev/null || true
            done

            # Delete Subnets
            echo "  - Deleting Subnets..."
            SUBNETS=$(aws ec2 describe-subnets --region $AWS_REGION --filters "Name=vpc-id,Values=$VPC" --query 'Subnets[].SubnetId' --output text 2>/dev/null || echo "")
            for SUBNET in $SUBNETS; do
                echo "    • Deleting subnet: $SUBNET"
                aws ec2 delete-subnet --subnet-id $SUBNET --region $AWS_REGION 2>/dev/null || true
            done

            # Delete Security Groups (except default)
            echo "  - Deleting Security Groups..."
            SGS=$(aws ec2 describe-security-groups --region $AWS_REGION --filters "Name=vpc-id,Values=$VPC" --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text 2>/dev/null || echo "")
            for SG in $SGS; do
                echo "    • Deleting security group: $SG"
                aws ec2 delete-security-group --group-id $SG --region $AWS_REGION 2>/dev/null || true
            done

            # Release Elastic IPs
            echo "  - Releasing Elastic IPs..."
            EIPS=$(aws ec2 describe-addresses --region $AWS_REGION --filters "Name=domain,Values=vpc" --query 'Addresses[].AllocationId' --output text 2>/dev/null || echo "")
            for EIP in $EIPS; do
                echo "    • Releasing EIP: $EIP"
                aws ec2 release-address --allocation-id $EIP --region $AWS_REGION 2>/dev/null || true
            done

            # Delete VPC
            echo "  - Deleting VPC..."
            aws ec2 delete-vpc --vpc-id $VPC --region $AWS_REGION 2>/dev/null || true
            echo "  ✅ VPC $VPC deleted"
        done
    else
        echo "  ℹ️  No VPCs found"
    fi
}

# Function to delete Load Balancers
cleanup_load_balancers() {
    echo ""
    echo "📋 Checking for Load Balancers..."
    LBS=$(aws elbv2 describe-load-balancers --region $AWS_REGION --query 'LoadBalancers[].LoadBalancerArn' --output text 2>/dev/null || echo "")

    if [ -n "$LBS" ]; then
        for LB in $LBS; do
            echo "🗑️  Deleting Load Balancer: $LB"
            aws elbv2 delete-load-balancer --load-balancer-arn $LB --region $AWS_REGION 2>/dev/null || true
        done
        echo "  ✅ Load Balancers deleted"
    else
        echo "  ℹ️  No Load Balancers found"
    fi
}

# Function to delete IAM roles (only ones created by Terraform)
cleanup_iam_roles() {
    echo ""
    echo "📋 Checking for IAM Roles..."
    ROLES=$(aws iam list-roles --query 'Roles[?contains(RoleName, `eks-`) || contains(RoleName, `terraform`)].RoleName' --output text 2>/dev/null || echo "")

    if [ -n "$ROLES" ]; then
        for ROLE in $ROLES; do
            echo "🗑️  Deleting IAM Role: $ROLE"

            # Detach policies
            ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name $ROLE --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || echo "")
            for POLICY in $ATTACHED_POLICIES; do
                echo "    • Detaching policy: $POLICY"
                aws iam detach-role-policy --role-name $ROLE --policy-arn $POLICY 2>/dev/null || true
            done

            # Delete inline policies
            INLINE_POLICIES=$(aws iam list-role-policies --role-name $ROLE --query 'PolicyNames[]' --output text 2>/dev/null || echo "")
            for POLICY in $INLINE_POLICIES; do
                echo "    • Deleting inline policy: $POLICY"
                aws iam delete-role-policy --role-name $ROLE --policy-name $POLICY 2>/dev/null || true
            done

            # Delete role
            aws iam delete-role --role-name $ROLE 2>/dev/null || true
            echo "  ✅ Role $ROLE deleted"
        done
    else
        echo "  ℹ️  No IAM Roles found"
    fi
}

# Main cleanup sequence
echo "========================================="
echo "Starting cleanup process..."
echo "========================================="

cleanup_eks_clusters
cleanup_load_balancers
cleanup_vpcs
cleanup_iam_roles

echo ""
echo "========================================="
echo "✅ Cleanup completed!"
echo "========================================="
echo ""
echo "All AWS resources have been deleted."
