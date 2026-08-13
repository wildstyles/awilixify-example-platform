# Publishing gets a separate role so building images cannot modify Terraform
# state or infrastructure.
resource "aws_iam_role" "github_image_publisher" {
  name               = "${local.project}-github-image-publisher"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

# The publisher permissions are limited to authenticating with ECR and working
# with images in the two service repositories.
data "aws_iam_policy_document" "github_image_publisher" {
  # ECR login requires an account-level authorization token.
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # Image operations are restricted to the two ARNs calculated in locals.
  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = local.ecr_arns
  }
}

# Attach the publisher permissions to the publisher role.
resource "aws_iam_role_policy" "github_image_publisher" {
  role   = aws_iam_role.github_image_publisher.id
  policy = data.aws_iam_policy_document.github_image_publisher.json
}
