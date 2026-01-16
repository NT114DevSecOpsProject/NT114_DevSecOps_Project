# Project Configuration
project_name = "nt114-devsecops"
environment  = "prod"
aws_region   = "us-east-1"

# VPC Configuration
vpc_name = "eks-vpc-prod"
vpc_cidr = "10.0.0.0/16"

availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnets    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnets     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# EKS Cluster Configuration
cluster_name    = "eks-prod"
cluster_version = "1.33"

# Application Node Group - min=2, desired=3, max=6 (Spot Fleet)
# t3.medium (2 vCPU, 4 GB) + t3a.medium (AMD, cheaper)
# Diversified for better spot availability
app_node_instance_types = ["t3.medium", "t3a.medium"]
app_node_capacity_type  = "ON_DEMAND"
app_node_min_size       = 2
app_node_desired_size   = 3
app_node_max_size       = 6

# ArgoCD Node Group - min=1, desired=1, max=2 (ON_DEMAND - Dedicated with taints)
argocd_node_instance_types = ["t3.medium", "t3a.medium"]
argocd_node_capacity_type  = "ON_DEMAND"
argocd_node_min_size       = 1
argocd_node_desired_size   = 2
argocd_node_max_size       = 2

# Monitoring Node Group - min=1, desired=1, max=2 (ON_DEMAND - Dedicated with taints)
monitoring_node_instance_types = ["t3.medium", "t3a.medium"]
monitoring_node_capacity_type  = "ON_DEMAND"
monitoring_node_min_size       = 1
monitoring_node_desired_size   = 1
monitoring_node_max_size       = 2

# RDS Configuration
rds_instance_identifier   = "nt114-postgres-prod"
rds_engine_version        = "14"
rds_instance_class        = "db.t3.small"
rds_allocated_storage     = 50
rds_max_allocated_storage = 200
rds_initial_database      = "postgres"
rds_username              = "postgres"
# rds_password is set via TF_VAR_rds_password environment variable

# Bastion Host Configuration
bastion_instance_name = "nt114-bastion-prod"
bastion_instance_type = "t3.small"
bastion_key_name      = "nt114-bastion-key-prod"
# bastion_public_key is set via TF_VAR_bastion_public_key environment variable

# S3 Configuration
migration_bucket_name = "nt114-migration-bucket-prod"

# Feature Toggles
# Note: ALB controller installed via GitHub Actions (see deploy-prod.yml)
# Used for internal ALB (ArgoCD, Grafana Ingress)
enable_alb_controller     = true
enable_ebs_csi_controller = true

# Cost Optimization
enable_nat_gateway = true
single_nat_gateway = true  # Use 1 NAT Gateway for all AZs to save cost (~$65/month savings)
