module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  # Core cluster parameters (v20.0 compatible)
  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  # VPC configuration
  vpc_id                   = var.vpc_id
  subnet_ids               = var.subnet_ids
  control_plane_subnet_ids = var.control_plane_subnet_ids

  # Cluster endpoint access
  cluster_endpoint_public_access  = var.cluster_endpoint_public_access
  cluster_endpoint_private_access = var.cluster_endpoint_private_access

  # IAM and permissions
  enable_irsa = var.enable_irsa

  # Authentication mode (required for v20.0)
  authentication_mode = "API_AND_CONFIG_MAP"

  # Encryption
  create_kms_key            = false
  cluster_encryption_config = var.cluster_encryption_config

  # Cluster addons
  cluster_addons = var.cluster_addons

  # Tags
  tags = var.tags
}
