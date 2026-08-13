# Outputs expose values used to connect tools and verify the cluster.
output "cluster_name" {
  value = aws_eks_cluster.this.name
}

output "configure_kubectl_command" {
  value = "aws eks update-kubeconfig --region eu-west-1 --name ${aws_eks_cluster.this.name}"
}
