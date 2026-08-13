# Calculate the exact ECR repositories used by the publisher and deployer roles.
# Locals can use for-expressions to transform one collection into another.
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
