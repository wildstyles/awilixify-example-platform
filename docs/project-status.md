# Project status

## Done

- [x] Orders API, Warehouse API, RabbitMQ, and DevTools UI
- [x] Production containers, health probes, and resource limits
- [x] Local Kubernetes deployment with Minikube
- [x] Reusable Helm chart for local Kubernetes and EKS
- [x] GitHub Actions checks and immutable image publishing
- [x] Amazon ECR repositories for application images
- [x] Terraform remote state in Amazon S3
- [x] AWS IAM roles, GitHub OIDC, and EKS Pod Identity
- [x] AWS Secrets Manager with External Secrets Operator
- [x] Route 53 hosted zone and Namecheap DNS delegation
- [x] ACM certificate creation and DNS validation
- [x] VPC, subnets, EKS cluster, node group, and EKS add-ons in Terraform
- [x] AWS Load Balancer Controller and HTTPS Ingress configuration
- [x] ExternalDNS configuration for Route 53 application records
- [x] GitHub Actions workflows for Terraform and Helm deployment
- [x] Helmfile inventory for controllers, application, and monitoring releases

## Next

- [x] Verify the first live EKS deployment and public HTTPS endpoints
- [x] Add Prometheus and Grafana monitoring
- [x] Add OpenTelemetry HTTP and RabbitMQ tracing with Collector and Tempo
- [ ] Add dashboards and alerts for Kubernetes, applications, and RabbitMQ
- [ ] Send structured container logs to Amazon CloudWatch Logs
- [ ] Test manual Helm rollback and add automatic rollback on failure
- [ ] Deploy images by digest and record deployment provenance
- [ ] Test HPA, Pod replacement, node failure, CPU limits, and OOM recovery
- [ ] Add NetworkPolicies and authenticate the public DevTools UI
- [ ] Add RabbitMQ persistence and try the RabbitMQ operators
- [ ] Compare in-cluster RabbitMQ with Amazon MQ for RabbitMQ
- [ ] Add AWS Budgets and cost alerts
- [ ] Add isolated pull-request preview environments and cleanup
- [ ] Try blue/green and canary deployments
