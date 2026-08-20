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

# Grafana's local administrator is infrastructure-owned, so Terraform creates
# a stable random password and stores it in the persistent Secrets Manager
# secret. The sensitive value is also present in the encrypted Terraform state;
# it is never printed by the workflow or committed to this repository.
resource "random_password" "grafana_admin" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "grafana" {
  name        = "${var.project_name}/grafana"
  description = "Grafana administrator credentials synchronized into EKS"
}

resource "aws_secretsmanager_secret_version" "grafana" {
  secret_id = aws_secretsmanager_secret.grafana.id
  secret_string = jsonencode({
    admin-user     = "admin"
    admin-password = random_password.grafana_admin.result
  })
}
