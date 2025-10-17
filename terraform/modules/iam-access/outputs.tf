output "admin_group_name" {
  description = "Name of the admin IAM group"
  value       = var.create_admin_group ? aws_iam_group.admin_group[0].name : null
}

output "admin_group_arn" {
  description = "ARN of the admin IAM group"
  value       = var.create_admin_group ? aws_iam_group.admin_group[0].arn : null
}

output "admin_role_name" {
  description = "Name of the admin IAM role"
  value       = var.create_admin_role ? aws_iam_role.admin_role[0].name : null
}

output "admin_role_arn" {
  description = "ARN of the admin IAM role"
  value       = var.create_admin_role ? aws_iam_role.admin_role[0].arn : null
}

output "assume_role_policy_arn" {
  description = "ARN of the assume role policy"
  value       = var.create_assume_role_policy ? aws_iam_policy.eks_assume_role_policy[0].arn : null
}

output "eks_access_entry_id" {
  description = "ID of the EKS access entry"
  value       = var.create_eks_access_entry ? aws_eks_access_entry.admin_access[0].id : null
}
