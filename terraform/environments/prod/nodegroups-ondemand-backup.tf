# ============================================================================
# ON-DEMAND BACKUP NODE GROUPS
# ============================================================================
# These node groups use ON_DEMAND capacity as fallback when SPOT is exhausted
# - min_size = 0: Only scale up when needed (Cluster Autoscaler triggers)
# - Same labels/taints as primary SPOT groups: pods can schedule to either
# - Priority: SPOT groups (cost-effective) → ON_DEMAND groups (reliability)

# Application On-Demand Backup
module "eks_nodegroup_app_ondemand" {
  source = "../../modules/eks-nodegroup"

  node_group_name      = "${var.cluster_name}-app-nodegroup-ondemand"
  cluster_name         = module.eks_cluster.cluster_name
  cluster_version      = var.cluster_version
  cluster_service_cidr = "172.20.0.0/16"
  subnet_ids           = module.vpc.private_subnets

  # Start at 0, scale up only when SPOT unavailable
  min_size     = 0
  max_size     = var.app_node_max_size  # Same max as SPOT
  desired_size = 0

  instance_types = var.app_node_instance_types  # Same types
  capacity_type  = "ON_DEMAND"  # Guaranteed capacity

  # Same labels as SPOT group → pods can schedule here
  labels = merge(
    var.app_node_labels,
    {
      workload       = "application"
      component      = "app"
      environment    = var.environment
      capacity-type  = "on-demand"  # Distinguish from SPOT
      fallback-group = "true"
    }
  )

  taints = var.app_node_taints

  enable_coredns_addon        = false  # Already enabled in primary group
  resolve_conflicts_on_create = var.resolve_conflicts_on_create
  resolve_conflicts_on_update = var.resolve_conflicts_on_update

  tags = merge(
    var.tags,
    {
      Module                                          = "eks-nodegroup-app-ondemand-backup"
      Environment                                     = "production"
      NodeType                                        = "application-ondemand"
      CapacityType                                    = "ON_DEMAND"
      "k8s.io/cluster-autoscaler/enabled"             = "true"
      "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
      "k8s.io/cluster-autoscaler/node-template/label/capacity-type" = "on-demand"
    }
  )

  depends_on = [module.eks_cluster, module.eks_nodegroup_app]
}

# ArgoCD On-Demand Backup
module "eks_nodegroup_argocd_ondemand" {
  source = "../../modules/eks-nodegroup"

  node_group_name      = "${var.cluster_name}-argocd-nodegroup-ondemand"
  cluster_name         = module.eks_cluster.cluster_name
  cluster_version      = var.cluster_version
  cluster_service_cidr = "172.20.0.0/16"
  subnet_ids           = module.vpc.private_subnets

  min_size     = 0
  max_size     = var.argocd_node_max_size
  desired_size = 0

  instance_types = var.argocd_node_instance_types
  capacity_type  = "ON_DEMAND"

  labels = merge(
    var.argocd_node_labels,
    {
      workload       = "argocd"
      component      = "gitops"
      environment    = var.environment
      capacity-type  = "on-demand"
      fallback-group = "true"
    }
  )

  taints = var.argocd_node_taints

  enable_coredns_addon        = false
  resolve_conflicts_on_create = var.resolve_conflicts_on_create
  resolve_conflicts_on_update = var.resolve_conflicts_on_update

  tags = merge(
    var.tags,
    {
      Module                                          = "eks-nodegroup-argocd-ondemand-backup"
      Environment                                     = "production"
      NodeType                                        = "argocd-ondemand"
      CapacityType                                    = "ON_DEMAND"
      "k8s.io/cluster-autoscaler/enabled"             = "true"
      "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
      "k8s.io/cluster-autoscaler/node-template/label/capacity-type" = "on-demand"
    }
  )

  depends_on = [module.eks_cluster, module.eks_nodegroup_argocd]
}

# Monitoring On-Demand Backup
module "eks_nodegroup_monitoring_ondemand" {
  source = "../../modules/eks-nodegroup"

  node_group_name      = "${var.cluster_name}-monitoring-nodegroup-ondemand"
  cluster_name         = module.eks_cluster.cluster_name
  cluster_version      = var.cluster_version
  cluster_service_cidr = "172.20.0.0/16"
  subnet_ids           = module.vpc.private_subnets

  min_size     = 0
  max_size     = var.monitoring_node_max_size
  desired_size = 0

  instance_types = var.monitoring_node_instance_types
  capacity_type  = "ON_DEMAND"

  labels = merge(
    var.monitoring_node_labels,
    {
      workload       = "monitoring"
      component      = "observability"
      environment    = var.environment
      capacity-type  = "on-demand"
      fallback-group = "true"
    }
  )

  taints = var.monitoring_node_taints

  enable_coredns_addon        = false
  resolve_conflicts_on_create = var.resolve_conflicts_on_create
  resolve_conflicts_on_update = var.resolve_conflicts_on_update

  tags = merge(
    var.tags,
    {
      Module                                          = "eks-nodegroup-monitoring-ondemand-backup"
      Environment                                     = "production"
      NodeType                                        = "monitoring-ondemand"
      CapacityType                                    = "ON_DEMAND"
      "k8s.io/cluster-autoscaler/enabled"             = "true"
      "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
      "k8s.io/cluster-autoscaler/node-template/label/capacity-type" = "on-demand"
    }
  )

  depends_on = [module.eks_cluster, module.eks_nodegroup_monitoring]
}
