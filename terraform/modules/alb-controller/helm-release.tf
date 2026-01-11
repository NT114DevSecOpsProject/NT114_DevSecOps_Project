# Helm release for AWS Load Balancer Controller

# Create Kubernetes namespace for ALB controller
resource "kubernetes_namespace" "alb_controller" {
  count = var.enable_alb_controller ? 1 : 0

  metadata {
    name = var.helm_namespace

    labels = {
      name = var.helm_namespace
    }
  }

  depends_on = [var.node_group_id]
}

resource "helm_release" "aws_load_balancer_controller" {
  count = var.enable_alb_controller ? 1 : 0

  depends_on = [var.node_group_id, aws_iam_role_policy_attachment.alb_controller, kubernetes_namespace.alb_controller]

  name       = var.helm_release_name
  namespace  = var.helm_namespace
  repository = var.helm_chart_repository
  chart      = var.helm_chart_name
  version    = var.helm_chart_version

  timeout = 1200 # 20 minutes timeout for Helm installation

  set {
    name  = "clusterName"
    value = var.cluster_name
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = var.vpc_id
  }

  set {
    name  = "serviceAccount.create"
    value = true
  }

  set {
    name  = "serviceAccount.name"
    value = var.service_account_name
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.alb_controller[0].arn
  }

  set {
    name  = "replicaCount"
    value = 1
  }

  # Tolerations to run on any node (including tainted nodes)
  set {
    name  = "tolerations[0].operator"
    value = "Exists"
  }

  dynamic "set" {
    for_each = var.additional_helm_values
    content {
      name  = set.key
      value = set.value
    }
  }
}
