# Helm release for AWS Load Balancer Controller

resource "helm_release" "aws_load_balancer_controller" {
  count = var.enable_alb_controller ? 1 : 0

  depends_on = [var.node_group_id, aws_iam_role_policy_attachment.alb_controller]

  name       = var.helm_release_name
  namespace  = var.helm_namespace
  repository = var.helm_chart_repository
  chart      = var.helm_chart_name
  version    = var.helm_chart_version

  timeout = 1200 # 20 minutes timeout for Helm installation

  set = concat([
    {
      name  = "clusterName"
      value = var.cluster_name
    },
    {
      name  = "region"
      value = var.aws_region
    },
    {
      name  = "vpcId"
      value = var.vpc_id
    },
    {
      name  = "serviceAccount.create"
      value = true
    },
    {
      name  = "serviceAccount.name"
      value = var.service_account_name
    },
    {
      name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
      value = aws_iam_role.alb_controller[0].arn
    },
    {
      name  = "replicaCount"
      value = 1
    }
  ],
  [
    for k, v in var.additional_helm_values : {
      name  = k
      value = v
    }
  ])
}
