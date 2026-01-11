# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  vpc_name           = var.vpc_name
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets

  enable_nat_gateway     = var.enable_nat_gateway
  single_nat_gateway     = var.single_nat_gateway
  one_nat_gateway_per_az = var.one_nat_gateway_per_az

  cluster_name = var.cluster_name

  tags = merge(
    var.tags,
    {
      Module      = "vpc"
      Environment = "production"
      Name        = "eks-vpc-prod"
    }
  )
}

# EKS Cluster Module (initial creation without EBS CSI addon)
module "eks_cluster" {
  source = "../../modules/eks-cluster"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  bootstrap_self_managed_addons   = var.bootstrap_self_managed_addons
  cluster_support_type            = var.cluster_support_type
  cluster_addons                  = var.cluster_addons
  cluster_endpoint_public_access  = var.cluster_endpoint_public_access
  cluster_endpoint_private_access = var.cluster_endpoint_private_access
  enable_irsa                     = var.enable_irsa

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  tags = merge(
    var.tags,
    {
      Module      = "eks-cluster"
      Environment = "production"
      Name        = "eks-prod"
    }
  )

  depends_on = [module.vpc]
}

# Kubernetes and Helm providers will be configured after EKS cluster creation
# Comment out ALB controller module for initial deployment

# Application Node Group
module "eks_nodegroup_app" {
  source = "../../modules/eks-nodegroup"

  node_group_name      = "${var.cluster_name}-app-nodegroup"
  cluster_name         = module.eks_cluster.cluster_name
  cluster_version      = var.cluster_version
  cluster_service_cidr = "172.20.0.0/16"
  subnet_ids           = module.vpc.private_subnets

  min_size     = var.app_node_min_size
  max_size     = var.app_node_max_size
  desired_size = var.app_node_desired_size

  instance_types = var.app_node_instance_types
  capacity_type  = var.app_node_capacity_type

  labels = merge(
    var.app_node_labels,
    {
      workload    = "application"
      component   = "app"
      environment = var.environment
    }
  )

  taints = var.app_node_taints

  # CoreDNS addon with tolerations to run on tainted nodes
  enable_coredns_addon = true
  coredns_version      = var.coredns_version
  coredns_configuration_values = jsonencode({
    tolerations = [
      {
        operator = "Exists"
      }
    ]
  })
  resolve_conflicts_on_create = var.resolve_conflicts_on_create
  resolve_conflicts_on_update = var.resolve_conflicts_on_update

  tags = merge(
    var.tags,
    {
      Module      = "eks-nodegroup-app"
      Environment = "production"
      NodeType    = "application"
    }
  )

  depends_on = [module.eks_cluster]
}

# ArgoCD Node Group
module "eks_nodegroup_argocd" {
  source = "../../modules/eks-nodegroup"

  node_group_name      = "${var.cluster_name}-argocd-nodegroup"
  cluster_name         = module.eks_cluster.cluster_name
  cluster_version      = var.cluster_version
  cluster_service_cidr = "172.20.0.0/16"
  subnet_ids           = module.vpc.private_subnets

  min_size     = var.argocd_node_min_size
  max_size     = var.argocd_node_max_size
  desired_size = var.argocd_node_desired_size

  instance_types = var.argocd_node_instance_types
  capacity_type  = var.argocd_node_capacity_type

  labels = merge(
    var.argocd_node_labels,
    {
      workload    = "argocd"
      component   = "gitops"
      environment = var.environment
    }
  )

  taints = var.argocd_node_taints

  enable_coredns_addon        = false
  resolve_conflicts_on_create = var.resolve_conflicts_on_create
  resolve_conflicts_on_update = var.resolve_conflicts_on_update

  tags = merge(
    var.tags,
    {
      Module      = "eks-nodegroup-argocd"
      Environment = "production"
      NodeType    = "argocd"
    }
  )

  depends_on = [module.eks_cluster, module.eks_nodegroup_app]
}

# Monitoring Node Group
module "eks_nodegroup_monitoring" {
  source = "../../modules/eks-nodegroup"

  node_group_name      = "${var.cluster_name}-monitoring-nodegroup"
  cluster_name         = module.eks_cluster.cluster_name
  cluster_version      = var.cluster_version
  cluster_service_cidr = "172.20.0.0/16"
  subnet_ids           = module.vpc.private_subnets

  min_size     = var.monitoring_node_min_size
  max_size     = var.monitoring_node_max_size
  desired_size = var.monitoring_node_desired_size

  instance_types = var.monitoring_node_instance_types
  capacity_type  = var.monitoring_node_capacity_type

  labels = merge(
    var.monitoring_node_labels,
    {
      workload    = "monitoring"
      component   = "observability"
      environment = var.environment
    }
  )

  taints = var.monitoring_node_taints

  enable_coredns_addon        = false
  resolve_conflicts_on_create = var.resolve_conflicts_on_create
  resolve_conflicts_on_update = var.resolve_conflicts_on_update

  tags = merge(
    var.tags,
    {
      Module      = "eks-nodegroup-monitoring"
      Environment = "production"
      NodeType    = "monitoring"
    }
  )

  depends_on = [module.eks_cluster, module.eks_nodegroup_app]
}

# ALB Controller Module - Manages AWS Load Balancer Controller
module "alb_controller" {
  source = "../../modules/alb-controller"

  cluster_name      = module.eks_cluster.cluster_name
  aws_region        = var.aws_region
  vpc_id            = module.vpc.vpc_id
  oidc_provider     = module.eks_cluster.oidc_provider
  oidc_provider_arn = module.eks_cluster.oidc_provider_arn
  node_group_id     = module.eks_nodegroup_app.node_group_id

  enable_alb_controller     = var.enable_alb_controller
  enable_ebs_csi_controller = var.enable_ebs_csi_controller

  helm_release_name      = var.helm_release_name
  helm_namespace         = var.helm_namespace
  helm_chart_name        = var.helm_chart_name
  helm_chart_repository  = var.helm_chart_repository
  helm_chart_version     = var.helm_chart_version
  service_account_name   = var.service_account_name
  additional_helm_values = var.additional_helm_values
}

# EBS CSI Driver Module - Storage provisioner for EBS volumes
module "ebs_csi_driver" {
  source = "../../modules/ebs-csi-driver"

  cluster_name      = module.eks_cluster.cluster_name
  oidc_provider     = module.eks_cluster.oidc_provider
  oidc_provider_arn = module.eks_cluster.oidc_provider_arn

  addon_version = var.ebs_csi_addon_version

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  depends_on = [
    module.eks_nodegroup_application,
    module.eks_nodegroup_argocd,
    module.eks_nodegroup_monitoring
  ]
}

# RDS PostgreSQL Module
module "rds_postgresql" {
  source = "../../modules/rds-postgresql"

  db_identifier  = var.rds_instance_identifier
  engine_version = var.rds_engine_version
  instance_class = var.rds_instance_class

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_encrypted     = false # Disabled for demo

  db_name  = var.rds_initial_database
  username = var.rds_username
  password = var.rds_password
  port     = var.rds_port

  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnets
  eks_security_group_ids = [module.eks_cluster.cluster_security_group_id]

  backup_retention_period = 1 # Enable backups for destroy-restore workflow
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot       = false # Create final snapshot before destroy
  final_snapshot_identifier = var.rds_final_snapshot_identifier
  deletion_protection       = false # No deletion protection for demo

  monitoring_interval             = 0
  enabled_cloudwatch_logs_exports = []
  log_retention_days              = 1

  tags = merge(var.tags, {
    Name        = var.rds_instance_identifier
    Environment = "production"
  })

  depends_on = [
    module.vpc
  ]
}

# S3 Bucket for Migration Files - Simplified for demo
resource "aws_s3_bucket" "migration" {
  bucket = "${var.migration_bucket_name}-${random_id.bucket_suffix.hex}"

  tags = merge(var.tags, {
    Name        = var.migration_bucket_name
    Environment = "production"
  })
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Minimal S3 configuration for demo
resource "aws_s3_bucket_versioning" "migration" {
  bucket = aws_s3_bucket.migration.id
  versioning_configuration {
    status = "Disabled" # Disabled for demo
  }
}

resource "aws_s3_bucket_public_access_block" "migration" {
  bucket = aws_s3_bucket.migration.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Data source to find EKS-managed cluster security group
data "aws_security_group" "eks_cluster_sg" {
  filter {
    name   = "tag:aws:eks:cluster-name"
    values = [var.cluster_name]
  }

  filter {
    name   = "group-name"
    values = ["eks-cluster-sg-${var.cluster_name}-*"]
  }

  depends_on = [module.eks_cluster]
}

# Allow EKS cluster to access RDS (Terraform-managed security group)
resource "aws_security_group_rule" "rds_from_eks_cluster" {
  type                     = "ingress"
  from_port                = var.rds_port
  to_port                  = var.rds_port
  protocol                 = "tcp"
  source_security_group_id = module.eks_cluster.cluster_security_group_id
  security_group_id        = module.rds_postgresql.security_group_id
  description              = "PostgreSQL from EKS Cluster (Terraform-managed SG)"

  depends_on = [
    module.rds_postgresql,
    module.eks_cluster
  ]
}

# Allow EKS worker nodes to access RDS (EKS-managed security group)
resource "aws_security_group_rule" "rds_from_eks_nodes" {
  type                     = "ingress"
  from_port                = var.rds_port
  to_port                  = var.rds_port
  protocol                 = "tcp"
  source_security_group_id = data.aws_security_group.eks_cluster_sg.id
  security_group_id        = module.rds_postgresql.security_group_id
  description              = "PostgreSQL from EKS Worker Nodes (EKS-managed SG)"

  depends_on = [
    module.rds_postgresql,
    module.eks_cluster,
    data.aws_security_group.eks_cluster_sg
  ]
}

# Allow bastion host to access RDS (separate rule to avoid circular dependency)
resource "aws_security_group_rule" "rds_from_bastion" {
  type                     = "ingress"
  from_port                = var.rds_port
  to_port                  = var.rds_port
  protocol                 = "tcp"
  source_security_group_id = module.bastion_host.security_group_id
  security_group_id        = module.rds_postgresql.security_group_id
  description              = "PostgreSQL from Bastion Host"

  depends_on = [
    module.rds_postgresql,
    module.bastion_host
  ]
}

# Bastion Host Module - Simplified for demo
module "bastion_host" {
  source = "../../modules/bastion-host"

  instance_name = var.bastion_instance_name
  environment   = var.environment

  instance_type = var.bastion_instance_type
  ami_id        = var.bastion_ami_id

  key_name   = var.bastion_key_name
  public_key = var.bastion_public_key

  vpc_id            = module.vpc.vpc_id
  public_subnet_id  = module.vpc.public_subnets[0] # Use first public subnet
  allowed_ssh_cidrs = var.bastion_allowed_ssh_cidrs

  rds_security_group_ids = [module.rds_postgresql.security_group_id]

  db_host     = module.rds_postgresql.db_instance_endpoint
  db_port     = module.rds_postgresql.db_instance_port
  db_username = module.rds_postgresql.db_instance_username
  db_password = var.rds_password # Use variable directly

  s3_bucket_name = aws_s3_bucket.migration.bucket

  root_volume_size = 8 # Smaller for demo
  allocate_eip     = true

  tags = merge(var.tags, {
    Name        = var.bastion_instance_name
    Environment = "production"
  })

  depends_on = [
    module.rds_postgresql,
    aws_s3_bucket.migration
  ]
}

# IAM Access Control Module - ENABLED for EKS v20.0 API_AND_CONFIG_MAP authentication mode
module "iam_access" {
  source = "../../modules/iam-access"

  cluster_name = module.eks_cluster.cluster_name

  create_admin_group        = var.create_admin_group
  admin_group_name          = var.admin_group_name
  create_admin_role         = var.create_admin_role
  admin_role_name           = var.admin_role_name
  attach_admin_policy       = var.attach_admin_policy
  create_assume_role_policy = var.create_assume_role_policy
  assume_role_policy_name   = var.assume_role_policy_name

  create_eks_access_entry  = var.create_eks_access_entry
  access_entry_type        = var.access_entry_type
  create_eks_access_policy = var.create_eks_access_policy
  eks_access_policy_arn    = var.eks_access_policy_arn
  access_scope_type        = var.access_scope_type
  access_scope_namespaces  = var.access_scope_namespaces

  # GitHub Actions EKS Access Configuration
  create_github_actions_access_entry     = true
  github_actions_user_arn                = "arn:aws:iam::039612870452:user/nt114-devsecops-github-actions-user"
  create_github_actions_access_policy    = true
  github_actions_access_policy_arn       = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  github_actions_access_scope_type       = "cluster"
  github_actions_access_scope_namespaces = []

  # Test User EKS Access Configuration
  create_test_user_access_entry     = true
  test_user_arn                     = "arn:aws:iam::039612870452:user/test_user"
  create_test_user_access_policy    = true
  test_user_access_policy_arn       = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  test_user_access_scope_type       = "cluster"
  test_user_access_scope_namespaces = []

  tags = merge(
    var.tags,
    {
      Module      = "iam-access"
      Environment = "production"
    }
  )

  depends_on = [module.eks_cluster]
}

# ECR Module
module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = var.environment

  # Add "prod/" prefix to all repository names for production environment
  repository_names = [
    "prod/api-gateway",
    "prod/exercises-service",
    "prod/scores-service",
    "prod/user-management-service",
    "prod/frontend"
  ]

  image_tag_mutability = "MUTABLE"
  scan_on_push         = true
  encryption_type      = "AES256"

  image_count_to_keep = 10
  untagged_image_days = 7

  create_github_actions_policy = true
  create_github_actions_user   = true

  tags = merge(
    var.tags,
    {
      Module      = "ecr"
      Environment = "production"
    }
  )
}
