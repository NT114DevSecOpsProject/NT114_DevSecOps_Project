variable "ebs_csi_driver_ready" {
  description = "Dependency trigger to ensure EBS CSI driver is ready before creating storage classes"
  type        = any
  default     = null
}
