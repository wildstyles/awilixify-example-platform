resource "aws_ecr_repository" "service" {
  for_each = local.services

  name                 = "${var.project_name}/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }

  # This is useful feedback for the learning platform. A deployment gate based
  # on scan findings can be added later without changing the repositories.
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "service" {
  for_each = aws_ecr_repository.service

  repository = each.value.name

  # Each service has its own repository. Keep its five newest images and let
  # ECR automatically expire every older image, whether tagged or untagged.
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the five newest images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}
