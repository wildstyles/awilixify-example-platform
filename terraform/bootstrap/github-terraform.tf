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

  # The persistent platform stack owns the RabbitMQ and Grafana secrets. The
  # RabbitMQ value is entered manually; Terraform generates the Grafana value.
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

  # Terraform creates and then reads back the generated Grafana secret version.
  # Keep value access scoped away from the manually managed RabbitMQ secret.
  statement {
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
    ]
    resources = ["arn:aws:secretsmanager:eu-west-1:${data.aws_caller_identity.current.account_id}:secret:${local.project}/grafana-*"]
  }

  # Route 53 will host DNS for the externally registered learning domain. These
  # permissions let the persistent platform stack create its hosted zone and,
  # in the next stage, manage DNS records used by ACM and the application.
  # Creation and change-status APIs cannot be scoped to a zone before it exists.
  statement {
    actions = [
      "route53:ChangeResourceRecordSets",
      "route53:ChangeTagsForResource",
      "route53:CreateHostedZone",
      "route53:DeleteHostedZone",
      "route53:GetChange",
      "route53:GetHostedZone",
      "route53:ListHostedZones",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResource",
    ]
    resources = ["*"]
  }

  # ACM will issue the public certificate used by the ALB. Terraform manages
  # the certificate lifecycle, while DNS records prove control of the domain.
  # RequestCertificate also has no certificate ARN until creation completes.
  statement {
    actions = [
      "acm:AddTagsToCertificate",
      "acm:DeleteCertificate",
      "acm:DescribeCertificate",
      "acm:ListCertificates",
      "acm:ListTagsForCertificate",
      "acm:RemoveTagsFromCertificate",
      "acm:RequestCertificate",
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
