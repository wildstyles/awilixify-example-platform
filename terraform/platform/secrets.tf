# Terraform creates only the Secrets Manager container and never handles its
# sensitive value. After applying this stack, enter the following JSON manually
# in the AWS Secrets Manager console before deploying the application:
# {
#   "username": "awilixify",
#   "password": "<strong-password>"
# }
#
# Secrets Manager is the long-lived source of truth. The secret remains when
# the disposable EKS stack is destroyed and recreated. External Secrets Operator
# later copies its JSON fields into the native Kubernetes Secret.
resource "aws_secretsmanager_secret" "rabbitmq" {
  name        = "${var.project_name}/rabbitmq"
  description = "RabbitMQ credentials synchronized into EKS"
}
