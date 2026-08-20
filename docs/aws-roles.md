# AWS roles in this project

An IAM role is an AWS identity used by a human, automation, an AWS service, an
EC2 machine, or a Kubernetes controller.

```text
trust policy      = who may become the role
permission policy = what the role may do
```

## Roles

| Role | Used by | Purpose | Created by |
| --- | --- | --- | --- |
| `AWSReservedSSO_AdministratorAccess_...` | Human through Identity Center | AWS Console, local bootstrap, `kubectl`, and Headlamp | AWS Identity Center |
| `awilixify-example-platform-github-terraform` | Terraform GitHub workflow | Manage persistent platform resources and the disposable EKS stack | Local bootstrap Terraform |
| `awilixify-example-platform-github-image-publisher` | Image-publishing GitHub workflow | Push Orders and Warehouse images to ECR | Local bootstrap Terraform |
| `awilixify-example-platform-github-deployer` | Helm deployment GitHub workflow | Connect to EKS, verify images, and deploy the chart | Local bootstrap Terraform |
| `awilixify-example-platform-eks-cluster` | AWS EKS control plane | Operate AWS resources needed by the cluster | EKS Terraform stack |
| `awilixify-example-platform-eks-node` | EC2 worker node | Join EKS, configure networking, and pull ECR images | EKS Terraform stack |
| `awilixify-example-platform-external-secrets` | External Secrets Operator through EKS Pod Identity | Read only the RabbitMQ and Grafana values from Secrets Manager | EKS Terraform stack |
| `awilixify-example-platform-external-dns` | ExternalDNS through EKS Pod Identity | Maintain application records in the project's Route 53 zone | EKS Terraform stack |
| `awilixify-example-platform-load-balancer-controller` | AWS Load Balancer Controller through EKS Pod Identity | Create and reconcile ALBs, listeners, and target groups | EKS Terraform stack |

The service/runtime roles exist in AWS IAM, not inside Kubernetes. EKS and Pod
Identity associate them with the control plane, node, or controller that uses
them.

## Creation order

```text
AWS Identity Center
└── creates the human AWSReservedSSO role

Human assumes that role and applies terraform/bootstrap locally
├── registers GitHub as an AWS OIDC provider
├── creates github-terraform
├── creates github-image-publisher
└── creates github-deployer

GitHub assumes github-terraform with a short-lived OIDC session
├── applies terraform/platform
│   ├── creates ECR repositories
│   ├── creates the RabbitMQ Secrets Manager container
│   └── creates the Grafana Secrets Manager value
└── applies terraform/eks
    ├── creates the EKS control-plane role
    ├── creates the EC2 node role
    ├── creates the External Secrets role
    ├── creates the ExternalDNS role
    ├── creates the AWS Load Balancer Controller role
    └── grants EKS access to the human and GitHub deployer roles
```

Bootstrap is applied locally first because GitHub cannot assume or extend roles
that do not exist yet.

## Terraform policy blocks

```hcl
resource "aws_iam_role" "example" { ... }
```

Creates the IAM identity in AWS.

```hcl
data "aws_iam_policy_document" "example" {
  statement { ... }
}
```

Builds policy JSON inside Terraform. Each `statement` is one allow or deny rule
describing actions and resources; it creates nothing in AWS by itself.

```hcl
resource "aws_iam_role_policy" "example" { ... }
```

Attaches the generated permission policy to the role in AWS.

The Terraform role uses all three objects:

```text
aws_iam_role.github_terraform
→ creates the real IAM identity

data.aws_iam_policy_document.github_terraform
→ builds permission rules as JSON; it does not collect or create IAM roles

aws_iam_role_policy.github_terraform
→ attaches that JSON to the real IAM identity
```

The attachment connects them explicitly:

```hcl
role   = aws_iam_role.github_terraform.id
policy = data.aws_iam_policy_document.github_terraform.json
```

The repeated `github_terraform` suffix is only a convenient local name. The
objects remain different because each has a different Terraform type.
