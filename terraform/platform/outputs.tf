output "repository_urls" {
  description = "ECR URL for every service image."
  value = {
    for service, repository in aws_ecr_repository.service : service => repository.repository_url
  }
}
