# Define the Helm provider
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# Add the Helm chart repository for AWS Load Balancer Controller
# Install the AWS Load Balancer Controller via Helm
resource "helm_release" "aws_load_balancer_controller" {
  depends_on = [module.eks_managed_node_group]
  name       = "aws-load-balancer-controller"
  namespace  = "kube-system"
  chart      = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }
  set {
    name  = "region"
    value = "us-east-1"
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }
}
