output "gp3_storage_class_name" {
  description = "Name of the gp3 storage class"
  value       = kubernetes_storage_class_v1.gp3.metadata[0].name
}
