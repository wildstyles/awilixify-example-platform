# ExternalDNS watches the application Ingress and keeps its public hostnames
# pointed at the ALB created by the AWS Load Balancer Controller.
variable "domain_name" {
  description = "Public domain managed by ExternalDNS for application Ingresses."
  type        = string
  default     = "awilixify.site"
}

data "aws_route53_zone" "platform" {
  name         = var.domain_name
  private_zone = false
}

data "aws_iam_policy_document" "external_dns_assume_role" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]

    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "external_dns" {
  name               = "${local.project}-external-dns"
  assume_role_policy = data.aws_iam_policy_document.external_dns_assume_role.json
}

# Limit DNS mutations to this project's public hosted zone. Listing zones is
# account-wide because Route 53 does not support resource scoping for that API.
data "aws_iam_policy_document" "external_dns" {
  statement {
    actions = [
      "route53:ChangeResourceRecordSets",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResources",
    ]
    resources = [data.aws_route53_zone.platform.arn]
  }

  statement {
    actions   = ["route53:ListHostedZones"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "external_dns" {
  role   = aws_iam_role.external_dns.id
  policy = data.aws_iam_policy_document.external_dns.json
}

# Connect the ExternalDNS Kubernetes service account to its AWS IAM role. Pods
# using this account receive temporary credentials whose policy allows them to
# maintain records in the project's Route 53 hosted zone.
resource "aws_eks_pod_identity_association" "external_dns" {
  cluster_name    = aws_eks_cluster.this.name
  namespace       = "external-dns"
  service_account = "external-dns"
  role_arn        = aws_iam_role.external_dns.arn

  depends_on = [aws_eks_addon.before_compute]
}
