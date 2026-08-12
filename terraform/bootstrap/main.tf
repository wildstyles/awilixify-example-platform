# The terraform block configures Terraform itself: compatible CLI and provider
# versions. It does not create an AWS resource.
terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  # required_providers declares which plugins Terraform must download.
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# A provider is the plugin Terraform uses to call an external API. Every AWS
# resource below uses this provider and is created in this region.
provider "aws" {
  region = "eu-west-1"
}

# A data block reads existing information without creating it. The AWS provider
# contains many data-source types; aws_caller_identity is the type that returns
# details about the authenticated AWS account, and current is our local name.
data "aws_caller_identity" "current" {}

# Locals give names to reusable values. They exist only inside this Terraform
# configuration and do not create resources or accept user input.
locals {
  project = "awilixify-example-platform"
}

# Outputs expose useful values after plan/apply. Other commands or automation
# can read them without repeating Terraform's lookup.
output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
