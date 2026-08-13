# The provider is the plugin Terraform uses to call AWS APIs.
provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      ManagedBy = "Terraform"
      Project   = local.project
      Purpose   = "Learning"
    }
  }
}

# Data sources read existing AWS information without creating resources.
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Locals are reusable values available throughout this Terraform directory.
locals {
  project               = "awilixify-example-platform"
  cluster_name          = local.project
  kubernetes_version    = "1.35"
  application_namespace = local.project
}

# It grants EKS cluster-admin access to the Identity Center permission-set role, which lets
# its assigned users administer the cluster.
variable "admin_role_arn" {
  description = "IAM Identity Center role ARN used for human cluster administration."
  type        = string

  validation {
    condition     = startswith(var.admin_role_arn, "arn:aws:iam::")
    error_message = "admin_role_arn must be an IAM role ARN."
  }
}
