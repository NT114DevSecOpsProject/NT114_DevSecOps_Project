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

# GP2 Storage Class (existing in-tree provisioner)
resource "kubernetes_storage_class_v1" "gp2" {
  metadata {
    name = "gp2"
  }

  storage_provisioner    = "kubernetes.io/aws-ebs"
  reclaim_policy         = "Delete"
  allow_volume_expansion = false
  volume_binding_mode    = "WaitForFirstConsumer"

  parameters = {
    type   = "gp2"
    fsType = "ext4"
  }
}
