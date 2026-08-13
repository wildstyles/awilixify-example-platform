# This creates the AWS identity used by the GitHub Helm deployment workflow.
# The assume-role policy allows the trusted repository's main branch to obtain
# short-lived credentials through GitHub OIDC; it gives no AWS permissions by
# itself. This role is separate from the Terraform and image-publisher roles so
# a deployment cannot modify infrastructure or push images.
resource "aws_iam_role" "github_deployer" {
  name               = "${local.project}-github-deployer"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

# This policy document describes the deployer's limited AWS API permissions. It
# does not create anything until it is attached to the role below. Kubernetes
# authorization is separate and is granted to this role by the EKS access entry
# in terraform/eks/cluster.tf.
data "aws_iam_policy_document" "github_deployer" {
  # `aws eks update-kubeconfig` needs cluster endpoint and certificate details
  # before kubectl or Helm can connect to this exact cluster.
  statement {
    actions   = ["eks:DescribeCluster"]
    resources = ["arn:aws:eks:eu-west-1:${data.aws_caller_identity.current.account_id}:cluster/${local.project}"]
  }

  # The deployment workflow verifies that both selected image tags already
  # exist in the project's ECR repositories before changing the Helm release.
  statement {
    actions   = ["ecr:DescribeImages"]
    resources = local.ecr_arns
  }
}

# Attach the policy above to the deployer identity. The role answers who GitHub
# becomes; this policy answers which AWS API calls that identity may make.
resource "aws_iam_role_policy" "github_deployer" {
  role   = aws_iam_role.github_deployer.id
  policy = data.aws_iam_policy_document.github_deployer.json
}
