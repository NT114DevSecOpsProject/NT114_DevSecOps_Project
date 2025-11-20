# IAM resources for EBS CSI Controller

data "aws_caller_identity" "current" {}

# IAM policy document for EBS CSI controller assume role
data "aws_iam_policy_document" "ebs_controller_assume_role_policy" {
  count = var.enable_ebs_csi_controller ? 1 : 0

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${var.oidc_provider}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider}:sub"
      values   = ["system:serviceaccount:kube-system:ebs-csi-controller-sa"]
    }
  }
}

# IAM role for EBS CSI driver
resource "aws_iam_role" "ebs_csi_controller" {
  count = var.enable_ebs_csi_controller ? 1 : 0

  name               = "${var.cluster_name}-ebs-csi-controller"
  assume_role_policy = data.aws_iam_policy_document.ebs_controller_assume_role_policy[0].json

  tags = {
    Name = "${var.cluster_name}-ebs-csi-controller"
  }

  lifecycle {
    ignore_changes = [name]  # Allow existing role to be managed
  }
}

# Attach AWS managed EBS CSI driver policy
resource "aws_iam_role_policy_attachment" "ebs_csi_controller" {
  count = var.enable_ebs_csi_controller ? 1 : 0

  role       = aws_iam_role.ebs_csi_controller[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}
