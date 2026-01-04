variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "oidc_provider" {
  description = "OIDC provider URL without https://"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  type        = string
}

variable "addon_version" {
  description = "Version of the EBS CSI driver addon"
  type        = string
  default     = null # Use latest version if not specified
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
