# Calculate the exact ECR repositories to which GitHub may publish. Locals can
# use for-expressions to transform one collection into another.
locals {
  ecr_arns = [
    for service in ["orders-api", "warehouse-api"] :
    "arn:aws:ecr:eu-west-1:${data.aws_caller_identity.current.account_id}:repository/${local.project}/${service}"
  ]
}

# This resource registers GitHub as a trusted identity provider. GitHub can then
# exchange an OIDC token for temporary credentials instead of storing AWS keys.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# This data block builds an IAM policy document. It defines who may assume the
# GitHub roles; a policy document alone creates nothing until a resource uses it.
data "aws_iam_policy_document" "github_assume_role" {
  # A statement is one rule inside an IAM policy document.
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    # principals identifies who receives this rule's permissions.
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    # Conditions further restrict when the statement applies. This requires a
    # token intended for AWS Security Token Service.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Accept the legacy and current immutable-ID subject formats, restricted to
    # this repository's main branch.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:wildstyles/awilixify-example-platform:ref:refs/heads/main",
        "repo:wildstyles@*/awilixify-example-platform@*:ref:refs/heads/main",
      ]
    }
  }
}

# An IAM role is an identity that a trusted caller can assume temporarily. This
# role will be used only by the GitHub Terraform workflow.
resource "aws_iam_role" "github_terraform" {
  name               = "${local.project}-github-terraform"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

# This policy document defines what the Terraform role may do after assuming
# the role: use platform state and manage ECR repositories.
data "aws_iam_policy_document" "github_terraform" {
  # Allow the workflow to inspect the state bucket itself.
  statement {
    actions   = ["s3:GetBucketLocation", "s3:ListBucket"]
    resources = [aws_s3_bucket.terraform_state.arn]
  }

  # Allow access only to the platform state object and its lock file.
  statement {
    actions   = ["s3:DeleteObject", "s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.terraform_state.arn}/platform/terraform.tfstate*"]
  }

  # The infrastructure workflow currently manages only ECR. Add permissions
  # here when EKS resources are introduced instead of granting administrator.
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
}

# This resource attaches the permissions above to the Terraform role. The role
# answers "who assumes it"; this policy answers "what they may do."
resource "aws_iam_role_policy" "github_terraform" {
  role   = aws_iam_role.github_terraform.id
  policy = data.aws_iam_policy_document.github_terraform.json
}

# Publishing gets a separate role so building images cannot modify Terraform
# state or infrastructure.
resource "aws_iam_role" "github_image_publisher" {
  name               = "${local.project}-github-image-publisher"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

# The publisher permissions are limited to authenticating with ECR and working
# with images in the two service repositories.
data "aws_iam_policy_document" "github_image_publisher" {
  # ECR login requires an account-level authorization token.
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # Image operations are restricted to the two ARNs calculated in locals.
  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = local.ecr_arns
  }
}

# Attach the publisher permissions to the publisher role.
resource "aws_iam_role_policy" "github_image_publisher" {
  role   = aws_iam_role.github_image_publisher.id
  policy = data.aws_iam_policy_document.github_image_publisher.json
}
