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

## Domain registration and DNS

Registering a domain and hosting its DNS are separate jobs:

- A **registry** operates a top-level domain such as `.com` or `.dev`.
- A **registrar**, such as Route 53, Cloudflare, or Namecheap, registers a
  chosen domain with that registry. Registration normally lasts at least one
  year and must be renewed; it is not a permanent purchase.
- A **DNS provider** hosts the domain's records and answers requests asking
  where its names should go.
- **Name servers** tell the public DNS system which DNS provider is authoritative
  for the domain.

The registrar and DNS provider may be the same company or different companies.
For example, a domain can be registered at Namecheap while its name servers and
DNS records are managed by Route 53. Registering through Route 53 can do both:
AWS registers the name, creates a hosted zone, assigns name servers, and lets us
manage its DNS records.

```text
Register awilixify.dev
        ↓
.dev registry records its authoritative Route 53 name servers
        ↓
Route 53 record: api.awilixify.dev → AWS load balancer
        ↓
Browser resolves the name and connects to the load balancer
```

One registered domain can have many subdomains without registering or paying
for each one separately. Records in the `awilixify.dev` hosted zone could route
`api.awilixify.dev`, `devtools.awilixify.dev`, and `staging.awilixify.dev` to the
same or different destinations. A wildcard record or certificate such as
`*.awilixify.dev` can cover many one-level subdomains when that is useful.

The `.dev` top-level domain is HSTS-preloaded, so browsers require HTTPS from
the first visit. That is useful for learning real HTTPS, but the ACM certificate
and HTTPS listener must be ready before browser testing.

### How do HTTP and HTTPS relate to a domain?

A domain is registered only once; there are no separate HTTP and HTTPS versions
of it. DNS resolves both URLs to the same load balancer. The URL scheme selects
the protocol and its default port:

```text
http://api.awilixify.dev   → port 80  → unencrypted HTTP
https://api.awilixify.dev  → port 443 → HTTP encrypted with TLS
even amqp://rabbitmq.awilixify.dev
```

The standard ports may be omitted from a URL. The ALB has separate listeners
for them. Port 80 redirects callers to HTTPS, while port 443 presents the ACM
certificate, decrypts the request, and routes it to the application:

```text
Browser → ALB port 80 → redirect to HTTPS
Browser → ALB port 443 → TLS ends at ALB → HTTP inside VPC → Service → Pod
```

The certificate proves that the server is authorized to serve a domain name;
it is attached to the ALB's HTTPS listener rather than purchased with the
domain. A non-exportable public ACM certificate used by an ALB has no separate
certificate charge and can renew automatically while DNS validation remains in
place. Because `.dev` is HSTS-preloaded, browsers may upgrade HTTP to HTTPS
before reaching the port 80 redirect, but keeping the redirect is still useful
for other clients.

### Why does the browser enforce HSTS for `.dev`?

HSTS means **HTTP Strict Transport Security**. Normally, a server teaches a
browser to use HTTPS for future visits by returning a header such as:

```http
Strict-Transport-Security: max-age=31536000
```

That leaves the first HTTP visit vulnerable: an attacker could intercept it and
prevent the redirect to HTTPS before the browser has learned the rule. Browsers
therefore ship with an HSTS preload list. The entire `.dev` top-level domain is
on that list, so a browser already knows to replace HTTP with HTTPS before it
sends the first network request:

```text
Entered:    http://api.awilixify.dev
Browser:    upgrades the URL locally
Connects:   https://api.awilixify.dev on port 443
```

Port 80 is not disabled; non-browser clients can still call it, which is why an
HTTP-to-HTTPS redirect remains useful. The policy belongs to the browser because
the browser chooses the protocol and validates certificates. DNS only resolves
the hostname to a destination. HSTS applies to browser HTTP traffic, not AMQP,
SSH, or other protocols.

## Questions

### What does a Route 53 hosted zone do?

A public hosted zone contains the DNS records for one domain and its
subdomains. It makes Route 53 the authoritative DNS provider, while the domain
can remain registered at another company such as Namecheap. For example:

```text
api.awilixify.site       → AWS load balancer
devtools.awilixify.site  → AWS load balancer
```

### How does ACM validate a certificate request?

Anyone can request a certificate for a domain, so ACM first creates it as
`PENDING_VALIDATION` and provides a CNAME—a DNS alias—such as:

```text
_abc.api.awilixify.site CNAME → _xyz.acm-validations.aws
```

Terraform adds this alias to the Route 53 zone authoritative for
`awilixify.site`. ACM queries the exact `_abc...` name through public DNS and
expects the `_xyz...` target. Only someone controlling that zone can normally
publish the alias, so a match proves domain control and ACM marks the
certificate `ISSUED`.

The CNAME is used only for validation and automatic renewal; it does not route
browser traffic. The certificate remains in ACM and is attached separately to
the ALB's HTTPS listener. Keep the CNAME in Route 53 for managed renewal.

### Is the validation CNAME similar to the application Alias?

Yes. Both are records in the same Route 53 zone:

```text
api.awilixify.site       A/Alias → application load balancer
_abc.api.awilixify.site CNAME  → _xyz.acm-validations.aws
```

The application Alias ultimately resolves to load-balancer IPs; the CNAME
aliases one hostname to another. The generated `_abc...` name is a subdomain,
not a URL path.

### How are HTTPS and application DNS attached to the ALB?

The AWS Load Balancer Controller reads the Ingress host rules, finds their
matching issued ACM certificate, and attaches it to the ALB's port 443 listener.
ExternalDNS reads the same hosts and the ALB address from Ingress status, then
creates their Route 53 application records. Both controllers keep their AWS
resources synchronized with the Ingress.

### How does ExternalDNS know what Route 53 record to create?

ExternalDNS watches the Ingress host rule:

```yaml
- host: api.awilixify.site
```

When the AWS Load Balancer Controller creates an ALB, AWS assigns it a hostname
that remains stable for that ALB's lifetime, although its IP addresses may
change. The controller writes that hostname into the Ingress's status, and
ExternalDNS combines it with the host rule to create:

```text
api.awilixify.site → the Ingress's ALB hostname
```

Route 53 does not discover the ALB itself; ExternalDNS maintains this mapping.

### Does TLS validation happen for every HTTP request?

No. The ALB presents its ACM certificate during the TLS handshake for a new
connection. That encrypted connection can carry many HTTP requests. Closing a
browser tab does not guarantee that the browser closes the connection; it may
reuse an existing connection, or create a new one using faster TLS session
resumption.

### How do TCP, TLS, and HTTP work together?

For HTTP/1.1 and HTTP/2 over HTTPS, they run in this order:

```text
1. TCP handshake → opens a reliable two-way byte stream to ALB port 443
2. TLS handshake → validates the certificate and establishes encryption keys
3. HTTP          → sends encrypted requests and responses through that stream
```

TCP is the reliable pipe, TLS secures the pipe, and HTTP defines the messages
sent through it. The connection can carry multiple HTTP requests. HTTP/3 is the
exception: it uses TLS within QUIC over UDP instead of TCP.

### Does every HTTP request pass through Route 53?

No. DNS resolution and application traffic are separate. Route 53 answers where
the hostname currently points; the browser then connects directly to that
destination:

```text
Browser ──DNS question──→ Route 53
Browser ──HTTPS request──→ ALB → Service → Pod
```

The browser, operating system, or recursive DNS resolver caches the answer for
the record's TTL. It asks DNS again after the cache expires, rather than for
every HTTP request. Route 53 handles the hostname, such as
`api.awilixify.site`; the ALB and Ingress handle HTTP paths such as `/orders`.

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
