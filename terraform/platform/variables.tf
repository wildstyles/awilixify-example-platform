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
