module "eks_managed_node_group" {
  source  = "terraform-aws-modules/eks/aws//modules/eks-managed-node-group"
  version = "~> 20.0"

  name                 = var.node_group_name
  cluster_name         = var.cluster_name
  cluster_version      = var.cluster_version
  cluster_service_cidr = var.cluster_service_cidr
  subnet_ids           = var.subnet_ids

  min_size     = var.min_size
  max_size     = var.max_size
  desired_size = var.desired_size

  instance_types = var.instance_types
  capacity_type  = var.capacity_type

  labels = var.labels

  # IAM role configuration
  create_iam_role = true
  iam_role_name   = "${var.node_group_name}-role"
  iam_role_additional_policies = {
    AmazonSSMManagedInstanceCore       = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    AmazonEC2ContainerRegistryReadOnly = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  }

  # Launch template configuration
  # Note: The module will create and manage the launch template with proper IAM permissions
  create_launch_template     = true
  use_custom_launch_template = false # Disable custom template to avoid IAM PassRole issues
  launch_template_name       = "${var.node_group_name}-lt"

  # EC2 Instance Metadata Service configuration
  # hop_limit = 2 required for pods to access metadata through container networking
  metadata_options = {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # Enforce IMDSv2 for security
    http_put_response_hop_limit = 2          # Allow pod-level metadata access
    instance_metadata_tags      = "disabled"
  }

  tags = var.tags
}

# CoreDNS addon
resource "aws_eks_addon" "coredns" {
  count = var.enable_coredns_addon ? 1 : 0

  depends_on   = [module.eks_managed_node_group]
  cluster_name = var.cluster_name
  addon_name   = "coredns"

  addon_version = var.coredns_version

  resolve_conflicts_on_create = var.resolve_conflicts_on_create
  resolve_conflicts_on_update = var.resolve_conflicts_on_update

  tags = var.tags
}
