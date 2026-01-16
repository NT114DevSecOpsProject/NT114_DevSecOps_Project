#!/bin/bash
# Import existing AWS resources into Terraform state for dev environment

set -e

echo "=== Importing Existing Resources into Terraform State ==="
echo ""

# Navigate to dev environment directory
cd "$(dirname "$0")"
pwd

echo "[1/3] Importing CloudWatch Log Group..."
terraform import \
  'module.eks_cluster.module.eks.aws_cloudwatch_log_group.this[0]' \
  '/aws/eks/eks-1/cluster' || echo "WARNING: CloudWatch Log Group import failed or already imported"

echo ""
echo "[2/3] Importing RDS DB Subnet Group..."
terraform import \
  'module.rds_postgresql.aws_db_subnet_group.rds' \
  'nt114-postgres-dev-subnet-group' || echo "WARNING: RDS Subnet Group import failed or already imported"

echo ""
echo "[3/3] Verifying Terraform state..."
terraform state list | grep -E "(cloudwatch_log_group|db_subnet_group)" || echo "No matching resources found"

echo ""
echo "=== Import Complete ==="
echo ""
echo "Next steps:"
echo "1. Run: terraform plan"
echo "2. Verify no resource recreation is planned"
echo "3. Run: terraform apply"
