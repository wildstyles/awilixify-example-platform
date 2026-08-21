# -----------------------------------------------------------------------------
# Shared CloudWatch target
# -----------------------------------------------------------------------------

locals {
  application_log_group_arn = "arn:aws:logs:eu-west-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/eks/${local.project}/application"
}

# -----------------------------------------------------------------------------
# Fluent Bit: write-only application log shipper
#
# Trust policy  -> EKS Pod Identity may issue temporary credentials.
# IAM role      -> the AWS identity used by Fluent Bit.
# Role policy   -> it may append streams only to our application log group.
# Association   -> only the cloudwatch/aws-for-fluent-bit service account gets
#                  this role. The application Pods receive no AWS credentials.
# -----------------------------------------------------------------------------

resource "aws_iam_role" "fluent_bit" {
  name               = "${local.project}-fluent-bit"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume_role.json
}

data "aws_iam_policy_document" "fluent_bit" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents",
    ]
    resources = ["${local.application_log_group_arn}:*"]
  }
}

resource "aws_iam_role_policy" "fluent_bit" {
  role   = aws_iam_role.fluent_bit.id
  policy = data.aws_iam_policy_document.fluent_bit.json
}

resource "aws_eks_pod_identity_association" "fluent_bit" {
  cluster_name    = aws_eks_cluster.this.name
  namespace       = "cloudwatch"
  service_account = "aws-for-fluent-bit"
  role_arn        = aws_iam_role.fluent_bit.arn

  depends_on = [aws_eks_addon.before_compute]
}

# -----------------------------------------------------------------------------
# Grafana: read-only CloudWatch query client
#
# Trust policy  -> EKS Pod Identity may issue temporary credentials.
# IAM role      -> a separate identity, never shared with the log writer.
# Role policy   -> it may read/query logs but cannot create streams or events.
# Association   -> only the monitoring/monitoring-grafana service account gets
#                  this role. Basic metric reads keep the datasource healthy.
# -----------------------------------------------------------------------------

resource "aws_iam_role" "grafana_cloudwatch" {
  name               = "${local.project}-grafana-cloudwatch"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume_role.json
}

data "aws_iam_policy_document" "grafana_cloudwatch" {
  statement {
    actions = [
      "cloudwatch:GetMetricData",
      "cloudwatch:GetMetricStatistics",
      "cloudwatch:ListMetrics",
      "ec2:DescribeRegions",
      "logs:DescribeLogGroups",
      "logs:GetQueryResults",
      "logs:ListAggregateLogGroupSummaries",
      "logs:StopQuery",
    ]
    resources = ["*"]
  }

  statement {
    actions = [
      "logs:FilterLogEvents",
      "logs:GetLogEvents",
      "logs:GetLogGroupFields",
      "logs:StartQuery",
    ]
    resources = [
      local.application_log_group_arn,
      "${local.application_log_group_arn}:*",
    ]
  }
}

resource "aws_iam_role_policy" "grafana_cloudwatch" {
  role   = aws_iam_role.grafana_cloudwatch.id
  policy = data.aws_iam_policy_document.grafana_cloudwatch.json
}

resource "aws_eks_pod_identity_association" "grafana_cloudwatch" {
  cluster_name    = aws_eks_cluster.this.name
  namespace       = "monitoring"
  service_account = "monitoring-grafana"
  role_arn        = aws_iam_role.grafana_cloudwatch.arn

  depends_on = [aws_eks_addon.before_compute]
}
