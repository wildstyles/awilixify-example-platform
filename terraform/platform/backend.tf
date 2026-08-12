terraform {
  # The bootstrap stack creates this bucket. The workflow supplies its name
  # and region during terraform init, so account-specific values stay out of Git.
  backend "s3" {
    key          = "platform/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}
