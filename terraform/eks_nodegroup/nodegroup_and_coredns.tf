# ---- Node group (submodule EKS v20) ----
module "eks_managed_node_group" {
  source  = "terraform-aws-modules/eks/aws//modules/eks-managed-node-group"
  version = "~> 20.0"

  name            = "eks-node"
  cluster_name    = module.eks.cluster_name
  cluster_version = "1.30"                # Đổi lại phiên bản bạn hỗ trợ
  subnet_ids      = module.vpc.private_subnets

  min_size     = 1
  max_size     = 2
  desired_size = 1

  instance_types = ["t3.large"]
  capacity_type  = "SPOT"

  # Chỉ dùng khi module EKS v20+ có output này. Nếu lỗi, hãy xoá dòng sau.
  # cluster_service_cidr = module.eks.cluster_service_cidr

  labels = {
    Environment = "test"
    GithubRepo  = "terraform-aws-eks"
    GithubOrg   = "terraform-aws-modules"
  }

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}

# ---- CoreDNS addon (chỉ dùng nếu KHÔNG cài bằng cluster_addons ở module "eks") ----
resource "aws_eks_addon" "coredns" {
  depends_on   = [module.eks_managed_node_group]
  cluster_name = module.eks.cluster_name
  addon_name   = "coredns"

  # Tuỳ vùng/phiên bản, có thể cần pin version:
  # addon_version = "v1.11.1-eksbuild.7"

  # Khi nâng cấp/xung đột có thể cần thêm:
  # resolve_conflicts_on_create = "OVERWRITE"
  # resolve_conflicts_on_update = "OVERWRITE"
}
