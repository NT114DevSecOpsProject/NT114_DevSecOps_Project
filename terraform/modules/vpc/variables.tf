variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "private_subnets" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
}

variable "public_subnets" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all private subnets"
  type        = bool
  default     = true
}

variable "one_nat_gateway_per_az" {
  description = "Create one NAT Gateway per availability zone"
  type        = bool
  default     = false
}

variable "cluster_name" {
  description = "Name of the EKS cluster for tagging"
  type        = string
}

variable "tags" {
  description = "Additional tags for VPC resources"
  type        = map(string)
  default     = {}
}
