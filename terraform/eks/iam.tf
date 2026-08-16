# These IAM roles exist in AWS, not inside Kubernetes, and are separate from the
# existing Identity Center admin role used by a human. The EKS control plane,
# EC2 worker node, External Secrets, and load-balancer controllers each need
# their own AWS identity because they cannot operate as the human administrator.

# An assume-role policy answers who may become an IAM role. EKS control plane
# service assumes this role to manage cluster resources on our behalf.
data "aws_iam_policy_document" "cluster_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "cluster" {
  name               = "${local.project}-eks-cluster"
  assume_role_policy = data.aws_iam_policy_document.cluster_assume_role.json
}

# AWS-managed policies contain standard permissions maintained by AWS. This one
# lets the EKS control plane manage the resources required by a cluster.
resource "aws_iam_role_policy_attachment" "cluster" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# EC2 worker nodes need a different role because virtual machines, rather than
# the EKS service, assume it.
data "aws_iam_policy_document" "node_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "node" {
  name               = "${local.project}-eks-node"
  assume_role_policy = data.aws_iam_policy_document.node_assume_role.json
}

# for_each creates one attachment for each standard node permission policy.
resource "aws_iam_role_policy_attachment" "node" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly",
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  ])

  role       = aws_iam_role.node.name
  policy_arn = each.value
}

# EKS Pod Identity lets the External Secrets controller receive temporary AWS
# credentials without access keys stored in Kubernetes.
data "aws_iam_policy_document" "external_secrets_assume_role" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]

    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "external_secrets" {
  name               = "${local.project}-external-secrets"
  assume_role_policy = data.aws_iam_policy_document.external_secrets_assume_role.json
}

# Look up the long-lived secret created by terraform/platform.
data "aws_secretsmanager_secret" "rabbitmq" {
  name = "${local.project}/rabbitmq"
}

# This policy grants read-only access to exactly one Secrets Manager secret.
data "aws_iam_policy_document" "external_secrets" {
  statement {
    actions = [
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
    ]
    resources = [data.aws_secretsmanager_secret.rabbitmq.arn]
  }
}

resource "aws_iam_role_policy" "external_secrets" {
  role   = aws_iam_role.external_secrets.id
  policy = data.aws_iam_policy_document.external_secrets.json
}

# The AWS Load Balancer Controller watches Kubernetes Ingress objects and
# creates their ALBs, target groups, listeners, and security-group rules.
data "aws_iam_policy_document" "load_balancer_controller_assume_role" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]

    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "load_balancer_controller" {
  name               = "${local.project}-load-balancer-controller"
  assume_role_policy = data.aws_iam_policy_document.load_balancer_controller_assume_role.json
}

# Keep the controller's version-pinned upstream policy separate from our role
# wiring. This avoids copying a large vendor policy into the readable IAM file.
resource "aws_iam_role_policy" "load_balancer_controller" {
  role   = aws_iam_role.load_balancer_controller.id
  policy = file("${path.module}/policies/aws-load-balancer-controller-v3.5.0.json")
}
