terraform {
  # A separate state key lets us destroy EKS without touching ECR, secrets, or
  # the bootstrap resources. Bucket and region are supplied during init.
  backend "s3" {
    key          = "eks/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}
