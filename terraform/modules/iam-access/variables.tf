variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "create_admin_group" {
  description = "Whether to create the admin IAM group"
  type        = bool
  default     = true
}

variable "admin_group_name" {
  description = "Name of the admin IAM group"
  type        = string
  default     = "eks-admin-group"
}

variable "create_admin_role" {
  description = "Whether to create the admin IAM role"
  type        = bool
  default     = true
}

variable "admin_role_name" {
  description = "Name of the admin IAM role"
  type        = string
  default     = "eks-admin-role"
}

variable "attach_admin_policy" {
  description = "Whether to attach the AdministratorAccess policy to the admin role"
  type        = bool
  default     = true
}

variable "create_assume_role_policy" {
  description = "Whether to create the assume role policy"
  type        = bool
  default     = true
}

variable "assume_role_policy_name" {
  description = "Name of the assume role policy"
  type        = string
  default     = "eks-assume-role-policy"
}

variable "create_eks_access_entry" {
  description = "Whether to create the EKS access entry"
  type        = bool
  default     = true
}

variable "access_entry_type" {
  description = "Type of access entry"
  type        = string
  default     = "STANDARD"
}

variable "create_eks_access_policy" {
  description = "Whether to create the EKS access policy association"
  type        = bool
  default     = true
}

variable "eks_access_policy_arn" {
  description = "ARN of the EKS access policy"
  type        = string
  default     = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
}

variable "access_scope_type" {
  description = "Type of access scope (cluster or namespace)"
  type        = string
  default     = "cluster"
}

variable "access_scope_namespaces" {
  description = "List of namespaces for access scope (only if type is namespace)"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to IAM resources"
  type        = map(string)
  default     = {}
}
