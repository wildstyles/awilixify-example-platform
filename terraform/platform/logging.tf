# Keep application logs outside the disposable EKS stack so they remain
# available after Pods, nodes, or the entire learning cluster are destroyed.
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/eks/${var.project_name}/application"
  retention_in_days = 7
}
