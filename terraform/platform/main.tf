provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy = "Terraform"
      Project   = var.project_name
    }
  }
}

locals {
  services = toset([
    "orders-api",
    "warehouse-api",
  ])
}
