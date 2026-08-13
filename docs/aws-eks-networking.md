# AWS EKS networking

## Are Pods public?

No. Creating the cluster does not make application Pods public.

The chart currently creates normal `ClusterIP` Services, so Orders, Warehouse,
RabbitMQ, and DevTools are reachable only inside the cluster:

```text
Pod → ClusterIP Service → matching Pods
```

Container ports and Deployment port declarations are also internal metadata;
they do not open internet access.

The EKS Kubernetes API endpoint is public so GitHub-hosted runners and local
`kubectl` can connect to it. IAM and EKS access policies protect that endpoint.
This is separate from exposing the application APIs.

To expose an application, explicitly add one of these:

- `kubectl port-forward` for temporary development access;
- a `LoadBalancer` Service for an AWS network load balancer;
- an Ingress and AWS Load Balancer Controller for HTTP routing through an ALB.

Only the public HTTP entry points should be routed externally. RabbitMQ and the
service DevTools ports should normally remain cluster-internal.

## Questions

### What is an Internet Gateway?

An Internet Gateway connects a VPC to the public internet. A resource also needs
a public IP, a route to the gateway, and allowed security rules; attaching the
gateway alone does not make resources public. It has no hourly resource charge.

### What is a route table?

A route table is a set of rules telling subnet traffic where to go. Each rule
maps a destination to a target:

```text
VPC address range → local VPC network
0.0.0.0/0        → Internet Gateway or NAT Gateway
```

A subnet associated with a route to an Internet Gateway is public. A private
subnet commonly sends its default outbound route to a NAT Gateway instead.

### Can EKS Pods reach each other without setting up a VPC?

No. EKS requires VPC subnets when the cluster is created, and worker nodes need
that underlying AWS network.

### Is a Service configuration while the VPC performs the real communication?

Yes. A Service provides a stable address and selects a set of Pods through
labels. The VPC and subnets provide the actual network and carry packets between
Pod addresses. Kubernetes add-ons(VPC CNI) configure the connection between the Service,
Pods, and that underlying AWS network.

### What are CoreDNS, kube-proxy, and VPC CNI?

- CoreDNS translates a Service name such as `rabbitmq` into its internal address.
- kube-proxy directs traffic from a Service address to one matching Pod.
- VPC CNI gives Pods addresses and connects them to the AWS VPC network.

### What is the difference between a VPC and a subnet?

A VPC is the complete isolated network for a region. A subnet is a smaller IP
range inside that VPC and belongs to exactly one availability zone. Resources
are placed into subnets, not directly into the VPC. This project divides its
`10.20.0.0/16` VPC into `10.20.0.0/24` and `10.20.1.0/24` subnets in two zones.

### Are VPCs and subnets like pipes while a Service is an address?

Yes. The VPC and subnets are the pipes and address space that carry packets. A
Service is a stable address plus a dispatcher that sends traffic to one matching
Pod, even when individual Pods and their addresses change.

### What does a NAT Gateway do?

NAT controls **outbound** internet access from private subnets; it does not affect
internal VPC traffic or allow the internet to start connections to Pods. It is
shared through a subnet route rather than configured per Pod.
Outbound access may be needed to pull images from ECR or GHCR, reach AWS service
endpoints, download updates, or let an application call an external API.

```text
Public node:  Node → Internet Gateway → Internet
Private node: Node → NAT Gateway → Internet Gateway → Internet
```

NAT is shared through subnet routes, still requires security rules, and has
hourly and data-processing charges.

### Do public subnets make every Pod public?

No. A public subnet has a route to an Internet Gateway, but a resource also
needs a public IP and allowed security rules to be reachable from the internet.

### What does an application need to connect to RabbitMQ in the same cluster?

It still needs protocol, host, port, username, and password. The cluster provides
the stable Service hostname `rabbitmq`; it does not make the host or credentials
optional. These fields can be passed separately or combined as
`amqp://username:password@rabbitmq:5672`.
