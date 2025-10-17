# This file configures Helm and Kubernetes providers
# IMPORTANT: Comment out these providers for the FIRST terraform apply
# After the EKS cluster is created, uncomment them and run terraform apply again

# data "aws_eks_cluster" "cluster" {
#   name = var.cluster_name
# }

# data "aws_eks_cluster_auth" "cluster" {
#   name = var.cluster_name
# }

# provider "kubernetes" {
#   host                   = data.aws_eks_cluster.cluster.endpoint
#   cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
#   token                  = data.aws_eks_cluster_auth.cluster.token
# }

# provider "helm" {
#   kubernetes {
#     host                   = data.aws_eks_cluster.cluster.endpoint
#     cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
#     token                  = data.aws_eks_cluster_auth.cluster.token
#   }
# }
