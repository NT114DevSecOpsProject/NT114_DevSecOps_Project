# Add IAM users to EKS cluster aws-auth ConfigMap
# This allows test_user to access the cluster via kubectl

data "aws_iam_user" "test_user" {
  user_name = "test_user"
}

# Update aws-auth ConfigMap to add test_user with system:masters permissions
resource "kubernetes_config_map_v1_data" "aws_auth" {
  metadata {
    name      = "aws-auth"
    namespace = "kube-system"
  }

  data = {
    mapUsers = yamlencode([
      {
        userarn  = data.aws_iam_user.test_user.arn
        username = "test_user"
        groups   = ["system:masters"]
      }
    ])
  }

  force = true

  depends_on = [module.eks_cluster]
}
