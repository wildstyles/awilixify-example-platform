output "repository_urls" {
  description = "ECR URL for every service image."
  value = {
    for service, repository in aws_ecr_repository.service : service => repository.repository_url
  }
}

# These authoritative nameservers must be copied to the domain's Custom DNS
# setting at Namecheap once. That delegates DNS without transferring ownership.
output "domain_name_servers" {
  description = "Route 53 nameservers to configure at the domain registrar."
  value       = aws_route53_zone.platform.name_servers
}

output "certificate_arn" {
  description = "Issued ACM certificate for the public application hosts."
  value       = aws_acm_certificate_validation.platform.certificate_arn
}

output "application_log_group_name" {
  description = "Persistent CloudWatch log group populated by EKS Fluent Bit."
  value       = aws_cloudwatch_log_group.application.name
}
