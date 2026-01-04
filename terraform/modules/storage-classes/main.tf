# GP3 Storage Class for EBS CSI Driver
resource "kubernetes_storage_class_v1" "gp3" {
  metadata {
    name = "gp3"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  storage_provisioner    = "ebs.csi.aws.com"
  reclaim_policy         = "Delete"
  allow_volume_expansion = true
  volume_binding_mode    = "Immediate"

  parameters = {
    type      = "gp3"
    fsType    = "ext4"
    encrypted = "false"
  }

  depends_on = [var.ebs_csi_driver_ready]
}

# Note: gp2 storage class already exists in the cluster (created by AWS/Kubernetes)
# We don't need to manage it with Terraform since we're using gp3 as default
