variable "node_group_name" {
  description = "Name of the EKS managed node group"
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the node group"
  type        = string
}

variable "cluster_service_cidr" {
  description = "The CIDR block for Kubernetes services (required by node group module)"
  type        = string
  default     = null
}

variable "subnet_ids" {
  description = "List of subnet IDs for the node group"
  type        = list(string)
}

variable "min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 3
}

variable "desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 1
}

variable "instance_types" {
  description = "List of instance types for the node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "capacity_type" {
  description = "Capacity type for node group (ON_DEMAND or SPOT)"
  type        = string
  default     = "ON_DEMAND"
}

variable "labels" {
  description = "Key-value map of Kubernetes labels"
  type        = map(string)
  default     = {}
}

variable "enable_coredns_addon" {
  description = "Enable CoreDNS addon"
  type        = bool
  default     = true
}

variable "coredns_version" {
  description = "Version of CoreDNS addon (leave null for latest)"
  type        = string
  default     = null
}

variable "resolve_conflicts_on_create" {
  description = "How to resolve conflicts on create"
  type        = string
  default     = "OVERWRITE"
}

variable "resolve_conflicts_on_update" {
  description = "How to resolve conflicts on update"
  type        = string
  default     = "OVERWRITE"
}

variable "coredns_configuration_values" {
  description = "Configuration values for CoreDNS addon (JSON string)"
  type        = string
  default     = null
}

variable "taints" {
  description = "Taints to apply to nodes in the node group"
  type = map(object({
    key    = string
    value  = string
    effect = string
  }))
  default = {}
}

variable "tags" {
  description = "Tags to apply to the node group"
  type        = map(string)
  default     = {}
}
