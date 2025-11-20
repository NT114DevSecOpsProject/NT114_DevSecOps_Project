variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the ALB controller will operate"
  type        = string
}

variable "oidc_provider" {
  description = "OIDC provider for the EKS cluster"
  type        = string
}

variable "oidc_provider_arn" {
  description = "OIDC provider ARN for the EKS cluster"
  type        = string
}

variable "node_group_id" {
  description = "Node group ID to create dependency"
  type        = string
}

variable "enable_alb_controller" {
  description = "Enable AWS Load Balancer Controller"
  type        = bool
  default     = true
}

variable "enable_ebs_csi_controller" {
  description = "Enable EBS CSI Controller IAM role"
  type        = bool
  default     = false
}

variable "helm_release_name" {
  description = "Name of the Helm release"
  type        = string
  default     = "aws-load-balancer-controller"
}

variable "helm_namespace" {
  description = "Kubernetes namespace for the Helm release"
  type        = string
  default     = "kube-system"
}

variable "helm_chart_name" {
  description = "Name of the Helm chart"
  type        = string
  default     = "aws-load-balancer-controller"
}

variable "helm_chart_repository" {
  description = "Helm chart repository URL"
  type        = string
  default     = "https://aws.github.io/eks-charts"
}

variable "helm_chart_version" {
  description = "Version of the Helm chart"
  type        = string
  default     = "1.15.0"
}

variable "service_account_name" {
  description = "Name of the Kubernetes service account"
  type        = string
  default     = "aws-load-balancer-controller"
}

variable "additional_helm_values" {
  description = "Additional Helm values to set"
  type        = map(string)
  default     = {}
}
