#!/bin/bash

# AWS Account Cleanup Script
# WARNING: This will DELETE ALL resources in your AWS account!
# Use with EXTREME caution!

set -e

AWS_REGION="${AWS_REGION:-us-east-1}"
DRY_RUN="${DRY_RUN:-true}"

echo "=========================================="
echo "AWS Account Resource Cleanup Script"
echo "=========================================="
echo "Region: $AWS_REGION"
echo "Dry Run: $DRY_RUN"
echo "=========================================="
echo ""

if [ "$DRY_RUN" = "false" ]; then
    read -p "⚠️  WARNING: This will DELETE ALL resources! Type 'DELETE-EVERYTHING' to confirm: " CONFIRM
    if [ "$CONFIRM" != "DELETE-EVERYTHING" ]; then
        echo "❌ Confirmation failed. Exiting."
        exit 1
    fi
fi

EXECUTE_CMD() {
    if [ "$DRY_RUN" = "true" ]; then
        echo "[DRY-RUN] $@"
    else
        echo "[EXECUTING] $@"
        eval "$@" || echo "⚠️  Command failed (continuing...)"
    fi
}

echo "🗑️  Step 1: Delete EKS Clusters..."
for cluster in $(aws eks list-clusters --region $AWS_REGION --query 'clusters[]' --output text 2>/dev/null || echo ""); do
    if [ -n "$cluster" ]; then
        echo "  - Deleting EKS cluster: $cluster"

        # Delete node groups first
        for ng in $(aws eks list-nodegroups --cluster-name $cluster --region $AWS_REGION --query 'nodegroups[]' --output text 2>/dev/null || echo ""); do
            EXECUTE_CMD "aws eks delete-nodegroup --cluster-name $cluster --nodegroup-name $ng --region $AWS_REGION"
        done

        # Wait for node groups to be deleted
        if [ "$DRY_RUN" = "false" ]; then
            echo "  ⏳ Waiting for node groups to be deleted..."
            sleep 30
        fi

        # Delete cluster
        EXECUTE_CMD "aws eks delete-cluster --name $cluster --region $AWS_REGION"
    fi
done

echo ""
echo "🗑️  Step 2: Delete RDS Instances..."
for db in $(aws rds describe-db-instances --region $AWS_REGION --query 'DBInstances[].DBInstanceIdentifier' --output text 2>/dev/null || echo ""); do
    if [ -n "$db" ]; then
        echo "  - Deleting RDS instance: $db"
        EXECUTE_CMD "aws rds delete-db-instance --db-instance-identifier $db --skip-final-snapshot --region $AWS_REGION"
    fi
done

echo ""
echo "🗑️  Step 3: Delete ECR Repositories..."
for repo in $(aws ecr describe-repositories --region $AWS_REGION --query 'repositories[].repositoryName' --output text 2>/dev/null || echo ""); do
    if [ -n "$repo" ]; then
        echo "  - Deleting ECR repository: $repo"
        EXECUTE_CMD "aws ecr delete-repository --repository-name $repo --force --region $AWS_REGION"
    fi
done

echo ""
echo "🗑️  Step 4: Delete S3 Buckets..."
for bucket in $(aws s3api list-buckets --query 'Buckets[].Name' --output text 2>/dev/null || echo ""); do
    if [ -n "$bucket" ]; then
        # Check if bucket is in our region
        bucket_region=$(aws s3api get-bucket-location --bucket $bucket --output text 2>/dev/null || echo "")
        if [ "$bucket_region" = "$AWS_REGION" ] || [ "$bucket_region" = "None" ]; then
            echo "  - Deleting S3 bucket: $bucket"
            EXECUTE_CMD "aws s3 rb s3://$bucket --force"
        fi
    fi
done

echo ""
echo "🗑️  Step 5: Delete Load Balancers..."
# Delete Application Load Balancers
for alb in $(aws elbv2 describe-load-balancers --region $AWS_REGION --query 'LoadBalancers[].LoadBalancerArn' --output text 2>/dev/null || echo ""); do
    if [ -n "$alb" ]; then
        echo "  - Deleting ALB: $alb"
        EXECUTE_CMD "aws elbv2 delete-load-balancer --load-balancer-arn $alb --region $AWS_REGION"
    fi
done

# Delete Classic Load Balancers
for elb in $(aws elb describe-load-balancers --region $AWS_REGION --query 'LoadBalancerDescriptions[].LoadBalancerName' --output text 2>/dev/null || echo ""); do
    if [ -n "$elb" ]; then
        echo "  - Deleting ELB: $elb"
        EXECUTE_CMD "aws elb delete-load-balancer --load-balancer-name $elb --region $AWS_REGION"
    fi
done

echo ""
echo "🗑️  Step 6: Delete EC2 Instances..."
for instance in $(aws ec2 describe-instances --region $AWS_REGION --filters "Name=instance-state-name,Values=running,stopped" --query 'Reservations[].Instances[].InstanceId' --output text 2>/dev/null || echo ""); do
    if [ -n "$instance" ]; then
        echo "  - Terminating EC2 instance: $instance"
        EXECUTE_CMD "aws ec2 terminate-instances --instance-ids $instance --region $AWS_REGION"
    fi
done

echo ""
echo "🗑️  Step 7: Delete NAT Gateways..."
for nat in $(aws ec2 describe-nat-gateways --region $AWS_REGION --filter "Name=state,Values=available" --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null || echo ""); do
    if [ -n "$nat" ]; then
        echo "  - Deleting NAT Gateway: $nat"
        EXECUTE_CMD "aws ec2 delete-nat-gateway --nat-gateway-id $nat --region $AWS_REGION"
    fi
done

if [ "$DRY_RUN" = "false" ]; then
    echo "  ⏳ Waiting for NAT Gateways to be deleted (60 seconds)..."
    sleep 60
fi

echo ""
echo "🗑️  Step 8: Release Elastic IPs..."
for eip in $(aws ec2 describe-addresses --region $AWS_REGION --query 'Addresses[].AllocationId' --output text 2>/dev/null || echo ""); do
    if [ -n "$eip" ]; then
        echo "  - Releasing EIP: $eip"
        EXECUTE_CMD "aws ec2 release-address --allocation-id $eip --region $AWS_REGION"
    fi
done

echo ""
echo "🗑️  Step 9: Delete VPCs (non-default)..."
for vpc in $(aws ec2 describe-vpcs --region $AWS_REGION --filters "Name=isDefault,Values=false" --query 'Vpcs[].VpcId' --output text 2>/dev/null || echo ""); do
    if [ -n "$vpc" ]; then
        echo "  - Deleting VPC: $vpc"

        # Delete subnets
        for subnet in $(aws ec2 describe-subnets --region $AWS_REGION --filters "Name=vpc-id,Values=$vpc" --query 'Subnets[].SubnetId' --output text 2>/dev/null || echo ""); do
            EXECUTE_CMD "aws ec2 delete-subnet --subnet-id $subnet --region $AWS_REGION"
        done

        # Delete route tables (except main)
        for rt in $(aws ec2 describe-route-tables --region $AWS_REGION --filters "Name=vpc-id,Values=$vpc" --query 'RouteTables[?Associations[0].Main!=`true`].RouteTableId' --output text 2>/dev/null || echo ""); do
            EXECUTE_CMD "aws ec2 delete-route-table --route-table-id $rt --region $AWS_REGION"
        done

        # Delete internet gateways
        for igw in $(aws ec2 describe-internet-gateways --region $AWS_REGION --filters "Name=attachment.vpc-id,Values=$vpc" --query 'InternetGateways[].InternetGatewayId' --output text 2>/dev/null || echo ""); do
            EXECUTE_CMD "aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $vpc --region $AWS_REGION"
            EXECUTE_CMD "aws ec2 delete-internet-gateway --internet-gateway-id $igw --region $AWS_REGION"
        done

        # Delete security groups (except default)
        for sg in $(aws ec2 describe-security-groups --region $AWS_REGION --filters "Name=vpc-id,Values=$vpc" --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text 2>/dev/null || echo ""); do
            EXECUTE_CMD "aws ec2 delete-security-group --group-id $sg --region $AWS_REGION"
        done

        # Delete VPC
        EXECUTE_CMD "aws ec2 delete-vpc --vpc-id $vpc --region $AWS_REGION"
    fi
done

echo ""
echo "=========================================="
if [ "$DRY_RUN" = "true" ]; then
    echo "✅ DRY RUN COMPLETE!"
    echo "No resources were deleted."
    echo ""
    echo "To actually delete resources, run:"
    echo "DRY_RUN=false bash $0"
else
    echo "✅ CLEANUP COMPLETE!"
    echo "All resources have been deleted."
fi
echo "=========================================="
