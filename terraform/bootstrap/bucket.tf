# A locals block can also contain calculated values. The account ID makes the
# S3 bucket name globally unique.
locals {
  state_bucket = "${local.project}-${data.aws_caller_identity.current.account_id}-terraform-state"
}

# A resource block describes infrastructure Terraform should create and manage.
# This S3 bucket will hold remote state for later Terraform runs.
resource "aws_s3_bucket" "terraform_state" {
  bucket = local.state_bucket

  # lifecycle changes how Terraform handles this resource. prevent_destroy
  # makes a plan fail instead of deleting the state bucket accidentally.
  lifecycle {
    prevent_destroy = true
  }
}

# Resource settings are sometimes separate resources in the AWS provider. This
# one prevents Terraform state from ever being exposed through public S3 access.
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning keeps previous copies of state objects, which helps recovery after
# an accidental or incorrect infrastructure change.
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  # Nested blocks configure a part of their parent resource.
  versioning_configuration {
    status = "Enabled"
  }
}

# Each output is a named value. This one is used when migrating the initial
# local state into the newly created S3 bucket.
output "state_bucket" {
  value = aws_s3_bucket.terraform_state.id
}
