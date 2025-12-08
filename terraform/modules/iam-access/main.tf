data "aws_caller_identity" "current" {}

# IAM Group for EKS Admins
# If group already exists, it will be adopted (may need manual import)
resource "aws_iam_group" "admin_group" {
  count = var.create_admin_group ? 1 : 0
  name  = var.admin_group_name

  lifecycle {
    ignore_changes = [name]
  }
}

# IAM Role for EKS Admins
# If role already exists, it will be adopted (may need manual import)
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
# If policy already exists, it will be adopted (may need manual import)
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

# EKS Access Entry
# If access entry already exists, it will be adopted (may need manual import)
resource "aws_eks_access_entry" "admin_access" {
  count         = var.create_eks_access_entry ? 1 : 0
  cluster_name  = var.cluster_name
  principal_arn = aws_iam_role.admin_role[0].arn
  type          = var.access_entry_type

  tags = var.tags

  lifecycle {
    ignore_changes = [tags]
  }
}

# EKS Access Policy Association
# If association already exists, it will be adopted (may need manual import)
resource "aws_eks_access_policy_association" "admin_policy" {
  count         = var.create_eks_access_policy ? 1 : 0
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
}

# EKS Access Entry for GitHub Actions User
# This allows GitHub Actions to authenticate with the EKS cluster
resource "aws_eks_access_entry" "github_actions_user_access" {
  count         = var.create_github_actions_access_entry ? 1 : 0
  cluster_name  = var.cluster_name
  principal_arn = var.github_actions_user_arn
  type          = "STANDARD"

  tags = var.tags

  lifecycle {
    ignore_changes = [tags]
  }
}

# EKS Access Policy Association for GitHub Actions User
resource "aws_eks_access_policy_association" "github_actions_user_policy" {
  count         = var.create_github_actions_access_entry && var.create_github_actions_access_policy ? 1 : 0
  cluster_name  = var.cluster_name
  policy_arn    = var.github_actions_access_policy_arn
  principal_arn = var.github_actions_user_arn

  access_scope {
    type       = var.github_actions_access_scope_type
    namespaces = var.github_actions_access_scope_namespaces
  }

  lifecycle {
    ignore_changes = [access_scope]
  }
}

# EKS Access Entry for Test User
# This allows test_user to authenticate with the EKS cluster via kubectl
resource "aws_eks_access_entry" "test_user_access" {
  count         = var.create_test_user_access_entry ? 1 : 0
  cluster_name  = var.cluster_name
  principal_arn = var.test_user_arn
  type          = "STANDARD"

  tags = var.tags

  lifecycle {
    ignore_changes = [tags]
  }
}

# EKS Access Policy Association for Test User
resource "aws_eks_access_policy_association" "test_user_policy" {
  count         = var.create_test_user_access_entry && var.create_test_user_access_policy ? 1 : 0
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
}
