module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"
  cluster_name    = "eks-1"
  cluster_version = "1.31"
  bootstrap_self_managed_addons = true
  cluster_upgrade_policy = {
   support_type = "STANDARD"
  }
  cluster_addons = {
    eks-pod-identity-agent = {}
    kube-proxy             = {}
    vpc-cni                = {}
  }

  # Optional
  cluster_endpoint_public_access = true
  # Optional: Adds the current caller identity as an administrator via cluster access entry
  enable_cluster_creator_admin_permissions = true
  #enable_irsa Determines whether to create an OpenID Connect Provider for EKS to enable IRSA
  enable_irsa = true
  vpc_id                   =  module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets
  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}
