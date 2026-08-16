variable "aws_region" {
  description = "AWS region for application infrastructure."
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Name prefix used by AWS resources."
  type        = string
  default     = "awilixify-example-platform"
}

variable "domain_name" {
  description = "Registered domain whose DNS is hosted by Route 53."
  type        = string
  default     = "awilixify.site"
}
