output "helm_release_name" {
  description = "Name of the Helm release"
  value       = var.enable_alb_controller ? helm_release.aws_load_balancer_controller[0].name : null
}

output "helm_release_namespace" {
  description = "Namespace of the Helm release"
  value       = var.enable_alb_controller ? helm_release.aws_load_balancer_controller[0].namespace : null
}

output "helm_release_version" {
  description = "Version of the Helm release"
  value       = var.enable_alb_controller ? helm_release.aws_load_balancer_controller[0].version : null
}

output "helm_release_status" {
  description = "Status of the Helm release"
  value       = var.enable_alb_controller ? helm_release.aws_load_balancer_controller[0].status : null
}
