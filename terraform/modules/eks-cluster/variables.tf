variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
}

variable "bootstrap_self_managed_addons" {
  description = "Bootstrap self-managed addons"
  type        = bool
  default     = true
}

variable "cluster_support_type" {
  description = "Cluster support type (STANDARD or EXTENDED)"
  type        = string
  default     = "STANDARD"
}

variable "cluster_addons" {
  description = "Map of cluster addon configurations"
  type        = any
  default = {
    coredns = {
      most_recent = true
    }
    eks-pod-identity-agent = {
      before_compute = true
    }
    kube-proxy = {}
    vpc-cni = {
      before_compute = true
    }
  }
}

variable "cluster_endpoint_public_access" {
  description = "Enable public access to cluster endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Enable private access to cluster endpoint"
  type        = bool
  default     = true
}


variable "enable_irsa" {
  description = "Enable IAM Roles for Service Accounts"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID where the cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the cluster"
  type        = list(string)
}

variable "control_plane_subnet_ids" {
  description = "List of subnet IDs for the control plane"
  type        = list(string)
}

variable "cluster_encryption_config" {
  description = "Configuration block with encryption configuration for the cluster"
  type        = any
  default     = {}
}

variable "tags" {
  description = "Tags to apply to the cluster"
  type        = map(string)
  default     = {}
}
