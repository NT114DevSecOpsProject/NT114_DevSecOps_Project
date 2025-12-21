data "aws_caller_identity" "current" {}

# IAM Group for EKS Admins
resource "aws_iam_group" "admin_group" {
  count = var.create_admin_group ? 1 : 0
  name  = var.admin_group_name

  lifecycle {
    ignore_changes = [name]
  }
}

# IAM Role for EKS Admins
resource "aws_iam_role" "admin_role" {
  count = var.create_admin_role ? 1 : 0
  name  = var.admin_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          "AWS" : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags

  lifecycle {
    ignore_changes = [tags, assume_role_policy]
  }
}

# Attach Admin Policy to Role
resource "aws_iam_role_policy_attachment" "admin_permissions" {
  count      = var.create_admin_role && var.attach_admin_policy ? 1 : 0
  role       = aws_iam_role.admin_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# IAM Policy for AssumeRole
resource "aws_iam_policy" "eks_assume_role_policy" {
  count       = var.create_assume_role_policy ? 1 : 0
  name        = var.assume_role_policy_name
  description = "Allows users in the group to assume the EKS admin role"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sts:AssumeRole"
        Resource = var.create_admin_role ? aws_iam_role.admin_role[0].arn : "*"
      }
    ]
  })

  tags = var.tags

  lifecycle {
    ignore_changes = [tags, policy]
  }
}

# Attach Policy to IAM Group
resource "aws_iam_group_policy_attachment" "attach_assume_role_policy" {
  count      = var.create_admin_group && var.create_assume_role_policy ? 1 : 0
  group      = aws_iam_group.admin_group[0].name
  policy_arn = aws_iam_policy.eks_assume_role_policy[0].arn
}

# ✅ Add current IAM user/role to EKS access (THIS FIXES kubectl ERROR)
resource "aws_eks_access_entry" "current_user_access" {
  cluster_name  = var.cluster_name
  principal_arn = data.aws_caller_identity.current.arn
  type          = "STANDARD"

  tags = merge(
    var.tags,
    {
      Name = "current-user-access"
    }
  )

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "aws_eks_access_policy_association" "current_user_admin_policy" {
  cluster_name  = var.cluster_name
  principal_arn = aws_eks_access_entry.current_user_access.principal_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.current_user_access]
}

# ✅ FIXED: EKS Access Entry for Admin Role
resource "aws_eks_access_entry" "admin_access" {
  count         = var.create_eks_access_entry && var.create_admin_role ? 1 : 0
  cluster_name  = var.cluster_name
  principal_arn = aws_iam_role.admin_role[0].arn
  type          = var.access_entry_type

  tags = var.tags

  lifecycle {
    ignore_changes = [tags]
  }

}

# ✅ FIXED: EKS Access Policy Association for Admin Role
resource "aws_eks_access_policy_association" "admin_policy" {
  count         = var.create_eks_access_policy && var.create_admin_role ? 1 : 0
  cluster_name  = var.cluster_name
  policy_arn    = var.eks_access_policy_arn
  principal_arn = aws_iam_role.admin_role[0].arn

  access_scope {
    type       = var.access_scope_type
    namespaces = var.access_scope_namespaces
  }

  lifecycle {
    ignore_changes = [access_scope]
  }

  depends_on = [aws_eks_access_entry.admin_access]
}

# ✅ EKS Access Entry for GitHub Actions User (OK - disabled by default)
resource "aws_eks_access_entry" "github_actions_user_access" {
  count         = var.create_github_actions_access_entry ? 1 : 0
  cluster_name  = var.cluster_name
  principal_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/nt114-devsecops-github-actions-user"
  type          = "STANDARD"

  tags = var.tags

  lifecycle {
    ignore_changes = [tags]
  }
}

# ✅ EKS Access Policy Association for GitHub Actions User (OK)
resource "aws_eks_access_policy_association" "github_actions_user_policy" {
  count         = var.create_github_actions_access_entry && var.create_github_actions_access_policy ? 1 : 0
  cluster_name  = var.cluster_name
  policy_arn    = var.github_actions_access_policy_arn
  principal_arn = length(aws_eks_access_entry.github_actions_user_access) > 0 ? aws_eks_access_entry.github_actions_user_access[0].principal_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/nt114-devsecops-github-actions-user"

  access_scope {
    type       = var.github_actions_access_scope_type
    namespaces = var.github_actions_access_scope_namespaces
  }

  lifecycle {
    ignore_changes = [access_scope]
  }

  depends_on = [aws_eks_access_entry.github_actions_user_access]
}

# ✅ EKS Access Entry for Test User (OK - disabled by default)
resource "aws_eks_access_entry" "test_user_access" {
  count         = var.create_test_user_access_entry && var.test_user_arn != "" ? 1 : 0
  cluster_name  = var.cluster_name
  principal_arn = var.test_user_arn
  type          = "STANDARD"

  tags = var.tags

  lifecycle {
    ignore_changes = [tags]
  }
}

# ✅ FIXED: EKS Access Policy Association for Test User
resource "aws_eks_access_policy_association" "test_user_policy" {
  count         = var.create_test_user_access_entry && var.create_test_user_access_policy && var.test_user_arn != "" ? 1 : 0
  cluster_name  = var.cluster_name
  policy_arn    = var.test_user_access_policy_arn
  principal_arn = var.test_user_arn

  access_scope {
    type       = var.test_user_access_scope_type
    namespaces = var.test_user_access_scope_namespaces
  }

  lifecycle {
    ignore_changes = [access_scope]
  }

  depends_on = [aws_eks_access_entry.test_user_access]
}
