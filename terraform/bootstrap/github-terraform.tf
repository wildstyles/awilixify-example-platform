# An IAM role is an identity that a trusted caller can assume temporarily. This
# role will be used only by the GitHub Terraform workflow.
resource "aws_iam_role" "github_terraform" {
  name               = "${local.project}-github-terraform"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

# This policy document defines what the Terraform role may do after assuming
# it: use remote state and manage this project's AWS infrastructure.
data "aws_iam_policy_document" "github_terraform" {
  # Allow the workflow to inspect the state bucket itself.
  statement {
    actions   = ["s3:GetBucketLocation", "s3:ListBucket"]
    resources = [aws_s3_bucket.terraform_state.arn]
  }

  # Allow access only to the platform state object and its lock file.
  statement {
    actions = ["s3:DeleteObject", "s3:GetObject", "s3:PutObject"]
    resources = [
      "${aws_s3_bucket.terraform_state.arn}/platform/terraform.tfstate*",
      "${aws_s3_bucket.terraform_state.arn}/eks/terraform.tfstate*",
    ]
  }

  # ECR repository management is separate from image publishing permissions.
  statement {
    actions = [
      "ecr:CreateRepository",
      "ecr:DeleteLifecyclePolicy",
      "ecr:DeleteRepository",
      "ecr:DescribeRepositories",
      "ecr:GetLifecyclePolicy",
      "ecr:GetRepositoryPolicy",
      "ecr:ListTagsForResource",
      "ecr:PutImageScanningConfiguration",
      "ecr:PutImageTagMutability",
      "ecr:PutLifecyclePolicy",
      "ecr:TagResource",
      "ecr:UntagResource",
    ]
    resources = ["*"]
  }

  # The EKS stack is disposable learning infrastructure. EC2 covers its VPC;
  # EKS covers the cluster, managed node group, add-ons, and access entries.
  statement {
    actions   = ["ec2:*", "eks:*"]
    resources = ["*"]
  }

  # This statement does not create or assign the EKS roles. It gives the GitHub
  # Terraform role permission to manage the project-prefixed roles declared in
  # terraform/eks/iam.tf: the EKS control plane, EC2 worker node, External
  # Secrets, and load-balancer identities. Those are AWS service/runtime roles
  # and are separate from the Identity Center role used for human access.
  statement {
    actions = [
      "iam:AttachRolePolicy",
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
      "iam:ListRolePolicies",
      "iam:PassRole",
      "iam:PutRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
    ]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.project}-*"]
  }

  # AWS creates service-linked roles when an account uses EKS for the first
  # time. EKS checks GetRole before that role exists, so this read-only action
  # cannot be restricted to the future service-linked role ARN.
  statement {
    actions = [
      "iam:CreateServiceLinkedRole",
      "iam:GetRole",
    ]
    resources = ["*"]
  }

  # The persistent platform stack owns only the RabbitMQ secret container.
  # Its sensitive value is entered manually and never passes through Terraform.
  statement {
    actions = [
      "secretsmanager:CreateSecret",
      "secretsmanager:DeleteSecret",
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:ListSecretVersionIds",
      "secretsmanager:TagResource",
      "secretsmanager:UntagResource",
      "secretsmanager:UpdateSecret",
    ]
    resources = ["arn:aws:secretsmanager:eu-west-1:${data.aws_caller_identity.current.account_id}:secret:${local.project}/*"]
  }
}

# This resource attaches the permissions above to the Terraform role. The role
# answers "who assumes it"; this policy answers "what they may do."
resource "aws_iam_role_policy" "github_terraform" {
  role   = aws_iam_role.github_terraform.id
  policy = data.aws_iam_policy_document.github_terraform.json
}
