terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.29"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.11.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Kubernetes and Helm providers with conditional configuration
# These will be configured after EKS cluster is created
data "aws_eks_cluster" "cluster" {
  count = try(module.eks_cluster.cluster_name, null) != null ? 1 : 0
  name  = module.eks_cluster.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  count = try(module.eks_cluster.cluster_name, null) != null ? 1 : 0
  name  = module.eks_cluster.cluster_name
}

provider "kubernetes" {
  host                   = try(module.eks_cluster.cluster_endpoint, "")
  cluster_ca_certificate = try(base64decode(module.eks_cluster.cluster_certificate_authority_data), "")
  token                  = try(data.aws_eks_cluster_auth.cluster[0].token, "")
}

provider "helm" {
  kubernetes {
    host                   = try(module.eks_cluster.cluster_endpoint, "")
    cluster_ca_certificate = try(base64decode(module.eks_cluster.cluster_certificate_authority_data), "")
    token                  = try(data.aws_eks_cluster_auth.cluster[0].token, "")
  }
}
