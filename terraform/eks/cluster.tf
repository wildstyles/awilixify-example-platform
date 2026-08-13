# The EKS cluster is AWS's managed Kubernetes control plane. Its public API is
# needed by GitHub-hosted runners; IAM and EKS access policies protect it.
resource "aws_eks_cluster" "this" {
  name     = local.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = local.kubernetes_version

  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = false
  }

  upgrade_policy {
    # STANDARD avoids the higher extended-support charge for old versions.
    support_type = "STANDARD"
  }

  vpc_config {
    subnet_ids              = aws_subnet.public[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  depends_on = [aws_iam_role_policy_attachment.cluster]
}

# A managed node group supplies EC2 compute for Pods. One t3.medium is enough
# for this demo and keeps cost predictable; this is not highly available.
resource "aws_eks_node_group" "learning" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "learning"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.public[*].id
  version         = local.kubernetes_version

  ami_type       = "AL2023_x86_64_STANDARD"
  capacity_type  = "ON_DEMAND"
  instance_types = ["t3.medium"]

  scaling_config {
    desired_size = 1
    min_size     = 1
    max_size     = 1
  }

  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_eks_addon.before_compute,
    aws_iam_role_policy_attachment.node,
  ]
}

# EKS add-ons are AWS-managed versions of Kubernetes system software that runs
# on worker nodes. `vpc-cni` gives Pods network addresses and AWS VPC
# connectivity. `eks-pod-identity-agent` gives authorized Pods temporary AWS
# credentials; External Secrets Operator needs it to read Secrets Manager.
resource "aws_eks_addon" "before_compute" {
  for_each = toset(["vpc-cni", "eks-pod-identity-agent"])

  cluster_name = aws_eks_cluster.this.name
  addon_name   = each.value

  # Replace any default self-managed copy installed during cluster creation.
  resolve_conflicts_on_create = "OVERWRITE"
}

# These add-ons need the worker node created above. `coredns` lets applications
# resolve Kubernetes names such as `rabbitmq` and `warehouse-api`. `kube-proxy`
# implements Service networking and forwards a Service's traffic to its Pods.
resource "aws_eks_addon" "after_compute" {
  for_each = toset(["coredns", "kube-proxy"])

  cluster_name = aws_eks_cluster.this.name
  addon_name   = each.value

  resolve_conflicts_on_create = "OVERWRITE"

  depends_on = [aws_eks_node_group.learning]
}

# Access entries map AWS IAM roles to Kubernetes access. The human Identity
# Center role and the GitHub deployer both receive admin access for this demo.
resource "aws_eks_access_entry" "admin" {
  for_each = {
    human    = var.admin_role_arn
    deployer = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.project}-github-deployer"
  }

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "admin" {
  for_each = aws_eks_access_entry.admin

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value.principal_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}

# Associate the External Secrets service account with its read-only IAM role.
# The service account is created later by the External Secrets Helm chart.
resource "aws_eks_pod_identity_association" "external_secrets" {
  cluster_name    = aws_eks_cluster.this.name
  namespace       = "external-secrets"
  service_account = "external-secrets"
  role_arn        = aws_iam_role.external_secrets.arn

  depends_on = [aws_eks_addon.before_compute]
}
