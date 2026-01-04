output "role_arn" {
  description = "ARN of the IAM role for EBS CSI driver"
  value       = aws_iam_role.ebs_csi_driver.arn
}

output "role_name" {
  description = "Name of the IAM role for EBS CSI driver"
  value       = aws_iam_role.ebs_csi_driver.name
}

output "addon_arn" {
  description = "ARN of the EBS CSI driver addon"
  value       = aws_eks_addon.ebs_csi_driver.arn
}

output "addon_version" {
  description = "Version of the EBS CSI driver addon"
  value       = aws_eks_addon.ebs_csi_driver.addon_version
}
