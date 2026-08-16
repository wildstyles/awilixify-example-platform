# AWS EKS networking

## Are Pods public?

No. Creating the cluster does not make application Pods public.

The chart creates normal `ClusterIP` Services. The AWS configuration additionally
creates an Ingress that exposes Orders and the DevTools UI through one ALB;
Warehouse, RabbitMQ, and the service DevTools ports remain internal.

```text
Pod → ClusterIP Service → matching Pods
```

Container ports and Deployment port declarations are also internal metadata;
they do not open internet access.

The EKS Kubernetes API endpoint is public so GitHub-hosted runners and local
`kubectl` can connect to it. IAM and EKS access policies protect that endpoint.
This is separate from exposing the application APIs.

Common ways to expose an application are:

- `kubectl port-forward` for temporary development access;
- a `LoadBalancer` Service for an AWS network load balancer;
- an Ingress and AWS Load Balancer Controller for HTTP routing through an ALB.

Only intended HTTP entry points should be routed externally. RabbitMQ and the
service DevTools ports should normally remain cluster-internal.

## Questions

### Does Kubernetes provide the underlying network itself?

No. Kubernetes defines networking objects and desired behavior. The VPC,
subnets, CNI, kube-proxy implementation, and cloud load balancer carry and route
the real traffic.

### Is an Ingress a load balancer?

No. An Ingress is routing configuration. The AWS Load Balancer Controller reads
it and creates/configures an ALB, which handles the real internet traffic:

```text
Ingress configuration → controller → AWS ALB
Internet request       → AWS ALB → Pod
```

### Why is a separate Ingress controller needed?

Kubernetes keeps Ingress vendor-neutral. A separately installed controller
translates it into a concrete implementation, such as an AWS ALB, NGINX proxy,
or another cloud provider's load balancer.

### Is the load balancer inside Kubernetes, and why does Terraform not create it?

The controller runs inside Kubernetes, but it calls the AWS Elastic Load
Balancing API to create a real ALB outside the cluster. Terraform creates the
VPC, EKS cluster, IAM role, and Pod Identity; Helm installs the controller and
Ingress; the controller owns the resulting ALB and keeps its targets synchronized
with the Pods. This is standard for Kubernetes-managed load balancers. The
Ingress must be deleted before EKS so the controller can also delete the ALB.

### Why use an AWS ALB instead of Traefik or NGINX?

ALB is managed by AWS and routes directly to Pods, making it simple for an
AWS-only cluster. Traefik and NGINX run as proxy Pods and offer more portable and
custom routing, but they must be operated and still need an external AWS entry
point.

### Is an NLB simpler than an ALB, and why is it used with an in-cluster proxy?

Yes, at the protocol level. An NLB forwards TCP/UDP connections by IP and port;
an ALB understands HTTP hosts, paths, and headers. An NLB commonly provides the
stable public entry point while Traefik or NGINX performs HTTP routing inside the
cluster. An ALB can perform both jobs directly.

### Why is it called a reverse proxy?

`Reverse` describes which side the proxy represents, not the direction of
traffic. A forward proxy represents and can hide the client from external
servers. A reverse proxy represents and hides backend servers from clients. In
this project, the browser knows the ALB address but not the selected Pod address:

```text
Forward proxy: client → proxy → external server  (hides the client)
Reverse proxy: client → ALB   → application Pod (hides the backend)
```

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

### Can Grafana show Pod CPU and memory usage?

Yes. Prometheus collects and stores node, Pod, and container metrics; Grafana
queries them and displays current and historical CPU, memory, limits, throttling,
restarts, and `OOMKilled` events. Grafana visualizes data but does not collect it.
