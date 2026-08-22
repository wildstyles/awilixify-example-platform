# EKS monitoring

## Questions

### What is Tempo?

Tempo is the trace backend. It receives traces, stores them, and lets Grafana
search and display them. A trace represents one operation and contains connected
spans such as:

```text
Orders HTTP request
  ├─ Warehouse HTTP request
  └─ RabbitMQ publish → RabbitMQ consume
```

Tempo is not the application instrumentation and it is not the UI. The
OpenTelemetry code creates spans, Tempo stores them, and Grafana displays them.

Tempo can also summarize those traces into metrics such as request count,
error count, request duration, and service relationships. It sends these
calculated metrics to Prometheus, which stores them for Grafana dashboards and
queries. Tempo does not send the complete raw traces to Prometheus:

```text
Tempo ──raw traces────────────────────────────→ Grafana
Tempo ──calculated trace metrics→ Prometheus ─→ Grafana
```

### What is telemetry?

Telemetry is data describing what a running system is doing. The main kinds are:

- **metrics**: numeric history such as CPU usage, request count, and latency;
- **traces**: the path and timing of one request across services;
- **logs**: individual text or structured events emitted by applications.

This setup collects Kubernetes metrics and application traces. Centralized logs
are a later CloudWatch or Loki step.

### What is Prometheus?

Prometheus is a metrics database and collector. It stores numeric time series
such as Pod memory, CPU usage, request rate, error rate, and latency over time.

Prometheus normally **pulls** metrics by scraping endpoints. In this setup,
Tempo also **pushes** trace-derived request metrics into Prometheus through its
private remote-write endpoint.

### What is Grafana?

Grafana is the visualization and query UI. It is not the main data store.
Grafana has data-source connections to both backends:

```text
Grafana → Prometheus → metrics and history
Grafana → Tempo      → individual distributed traces
```

The same Grafana screen can therefore show cluster CPU and memory from
Prometheus, then open a particular slow request from Tempo.

### What is OpenTelemetry?

OpenTelemetry is the vendor-neutral instrumentation and data format used by the
applications. The code loaded inside each Orders and Warehouse process observes
Fastify, outgoing `fetch` calls, and RabbitMQ operations and creates spans.

OpenTelemetry itself is not a storage database or UI. It produces and transports
telemetry to backends such as Tempo.

### How is OpenTelemetry loaded before the application?

Node loads `@awilixify-example-platform/observability/register` as a preload
before it evaluates `main.js`. That layer registers the Fastify, HTTP, Undici,
and RabbitMQ instrumentation before those libraries are imported, then starts
the application normally:

```text
Node → OpenTelemetry preload → application main module
```

The application bootstrap therefore does not know about the telemetry SDK. The
production container uses this preload, while the current local development
command starts without it because no local Collector or Tempo is installed.

### What is OTLP?

OTLP is the OpenTelemetry Protocol used to transmit telemetry. Each application
Pod sends batches of spans with HTTP POST requests to this private Kubernetes
endpoint:

```text
http://opentelemetry-collector.monitoring.svc.cluster.local:4318/v1/traces
```

This is telemetry traffic, not a normal application API request.

### What is the OpenTelemetry Collector?

The Collector is a private telemetry gateway running in the cluster. It accepts
OTLP data from the applications, batches it, retries temporary failures, and
forwards it to Tempo. It does not permanently store the traces.

Using a Collector means applications only need to know one stable in-cluster
endpoint. The destination backend can later change without changing every
application.

### How does trace data flow through the cluster?

For a normal request, the application and telemetry flows happen alongside each
other:

```text
Application flow:
Browser → ALB → Orders Pod → Warehouse Pod / RabbitMQ

Telemetry flow:
Orders / Warehouse
  → OTLP/HTTP
  → OpenTelemetry Collector
  → Tempo
  ├─ stored traces → Grafana
  └─ generated request metrics → Prometheus → Grafana
```

The OpenTelemetry code inside the application actively sends the trace data.
The Collector does not inspect the Pod or intercept its application traffic.
Export happens asynchronously in batches.

### Why is Prometheus needed if Tempo already stores telemetry?

Tempo is enough for inspecting individual traces. Prometheus is still useful
for aggregated questions and alerting:

- How many requests per second are being handled?
- What is the p95 latency per route?
- Is the error rate increasing?
- How much CPU and memory does each Pod use?

In short:

```text
Tempo      → what happened in this particular request?
Prometheus → how often does it happen, and how does it change over time?
Grafana    → display and connect both answers
```

### Where is the data stored and how long does it survive?

Tempo stores traces and Prometheus stores metrics for up to six hours. Both use
ephemeral Pod storage in this disposable cluster. Data may disappear when a Pod
is replaced and always disappears when the EKS cluster is destroyed.

Tempo can instead be configured with persistent object storage such as Amazon
S3. That allows traces to survive Pod and cluster replacement and supports a
longer retention period. A production system might retain sampled traces for
several days or weeks, while a short ephemeral history is sufficient for this
learning environment.

Grafana changes are also ephemeral. Grafana itself does not become another copy
of the Tempo or Prometheus data.

### How would CloudWatch collect and show application logs?

Applications write Pino JSON to standard output and do not call CloudWatch
directly. One Fluent Bit `DaemonSet` Pod per node reads the container log files,
keeps only the Orders and Warehouse API logs, adds Kubernetes metadata, and
pushes batches to CloudWatch Logs. DevTools UI, RabbitMQ, controller, and system
logs are discarded before ingestion:

```text
Pod stdout/stderr → node log files → agent Pod → CloudWatch Logs
```

CloudWatch stores the logs outside the disposable EKS cluster, so they can
survive Pod, node, and cluster deletion. Terraform sets seven-day retention.
They can be queried in the AWS console or through Grafana's provisioned
CloudWatch data source. Grafana remains the UI; CloudWatch is the managed log
storage and query backend, so Loki is not required.

Pino records an explicitly configured `service` and a textual `level`. When
OpenTelemetry has an active HTTP or RabbitMQ span, it also adds the same
`trace_id` and `span_id` used by Tempo. These fields are searchable labels,
which are more useful than a text prefix such as `[orders]`. For example,
Grafana Explore can run this CloudWatch Logs Insights query:

```text
fields @timestamp, data.service, data.level, data.msg, data.trace_id
| filter data.level in ["warn", "error"]
| sort @timestamp desc
```

Copying a `trace_id` from a Tempo trace into a log query shows the related logs
across both services. The initial EKS values enable `debug` so all four levels
can be explored; switch `logging.level` to `info` afterward to reduce noise and
CloudWatch ingestion cost.

CloudWatch is usually simpler for an AWS-only platform because AWS operates the
backend, but ingestion, retention, and log queries are billed and the solution
is AWS-specific. Loki provides a more native Grafana experience, avoids cloud
vendor lock-in, and can be cheaper at high log volume when backed by object
storage.

### Why are there about 27 Pods when the platform has only two API services?

The APIs are only part of the cluster. Kubernetes also runs the UI, RabbitMQ,
AWS integration controllers, networking components, secret controllers, and the
monitoring stack. The exact count changes during rollouts; the current
components normally produce about 27 Pods:

**Application — 4 Pods**

- `devtools-ui`: serves the DevTools web interface;
- `orders-api`: runs the Orders API;
- `warehouse-api`: runs the Warehouse API;
- `rabbitmq`: delivers messages between the application services.

**DNS and secrets — 4 Pods**

- `external-dns`: creates Route 53 records from Kubernetes Ingress hosts;
- `external-secrets`: copies values from AWS Secrets Manager into Kubernetes
  Secrets;
- `external-secrets-cert-controller`: manages the internal TLS certificate used
  by the External Secrets webhook; this is separate from ACM;
- `external-secrets-webhook`: validates `ExternalSecret` and `SecretStore`
  resources submitted to Kubernetes.

**Core Kubernetes and AWS integration — 9 Pods**

- one `aws-load-balancer-controller`: creates and configures the ALB from
  Kubernetes Ingress resources;
- two `aws-node`: one per node, providing AWS VPC networking and Pod IP
  addresses;
- two `coredns`: resolve private Kubernetes service names, with two replicas for
  availability;
- two `eks-pod-identity-agent`: one per node, supplying temporary AWS
  credentials to authorized Pods;
- two `kube-proxy`: one per node, routing Kubernetes Service traffic to Pods.

**Monitoring — 8 Pods**

- one `monitoring-grafana`: displays dashboards and traces; this Pod contains
  Grafana and two provisioning sidecars;
- one `monitoring-kube-prometheus-operator`: creates and configures Prometheus
  resources from Kubernetes monitoring definitions;
- one `monitoring-kube-state-metrics`: converts Kubernetes object state into
  Prometheus metrics;
- two `monitoring-prometheus-node-exporter`: one per node, reporting machine
  CPU, memory, disk, and network metrics;
- one `opentelemetry-collector`: receives application traces and forwards them
  to Tempo;
- one `prometheus-...-0`: stores metrics and contains a configuration-reloader
  sidecar alongside Prometheus;
- one `tempo-0`: stores application traces for Grafana.

**Logging — 2 Pods**

- two `aws-for-fluent-bit`: one per node, forwarding application container logs
  to the persistent CloudWatch log group.

Grouped by responsibility:

```text
Application                 4
External DNS                1
External Secrets            3
Core Kubernetes and AWS     9
Monitoring                  8
Logging                     2
                           --
                           27 Pods
```

Several components use a `DaemonSet`, which means Kubernetes creates one copy
on every node. Adding the second node therefore added another `aws-node`, Pod
Identity Agent, `kube-proxy`, node exporter, and Fluent Bit Pod.

The `READY` value counts containers inside a Pod, not Pods. For example,
`3/3` for Grafana means that one Grafana Pod has three ready containers.

## Learning checklist

### Grafana and metrics

- [x] Open the built-in Kubernetes dashboards.
- [x] Find CPU and memory usage by cluster, node, namespace, and Pod.
- [x] Compare actual usage with Kubernetes requests and limits.

### OpenTelemetry and tracing

- [ ] Send a request and find its trace in Grafana Tempo.
- [ ] Follow the trace from Orders through RabbitMQ to Warehouse.
- [ ] Understand trace IDs, parent spans, child spans, and span duration.
- [ ] Find the slowest operation in a trace.
- [ ] Verify inbound HTTP, outbound HTTP, and RabbitMQ instrumentation.
- [ ] Generate Prometheus request-rate, error-rate, and latency metrics from
      spans.

### Dashboards and alerts

- [ ] Create CPU and memory alerts based on Pod limits.
- [ ] Alert on Pod restarts and unavailable replicas.
- [ ] Alert on a sustained application error rate.
- [ ] Alert when p95 response latency stays above seven seconds.
- [ ] Configure Alertmanager delivery to Slack, email, or another receiver.
- [ ] Trigger each alert deliberately and verify both firing and recovery
      notifications.

### Failure exercises

- [ ] Delete an application Pod and watch Kubernetes replace it.
- [ ] Temporarily stop Warehouse and inspect the resulting metrics, traces, and
      logs.
- [ ] Introduce a controlled slow operation and observe its latency.
- [ ] Increase load until CPU or memory limits become visible.
- [ ] Compare behavior before and after increasing the replica count.
- [ ] Restart RabbitMQ and inspect messaging failures and recovery.

## Core production signals

Most production applications observe the same core categories. The exact
thresholds depend on the service, but the signals are broadly reusable:

- **Traffic:** requests per second, jobs processed, messages published and
  consumed, and active users.
- **Latency:** average and p50/p95/p99 response time, slow endpoints, background
  job duration, and end-to-end operation time.
- **Errors:** HTTP 5xx and 4xx rates, exceptions, failed jobs, rejected messages,
  retries, and timeouts.
- **Saturation:** CPU usage and throttling, memory usage and OOM kills, disk
  capacity and I/O, network usage, thread or event-loop delay, and queue depth.
- **Availability:** successful health checks, ready replicas, Pod restarts,
  deployment health, and externally measured uptime.
- **Databases:** query latency, slow-query count, connection-pool usage, failed
  queries, deadlocks, replication lag, storage, and CPU.
- **Messaging:** queue depth, oldest-message age, consumer lag, publish and
  consume failures, redeliveries, and dead-letter messages.
- **External dependencies:** downstream latency, error rate, timeouts, retries,
  and circuit-breaker state for every important API or managed service.
- **Runtime:** Node.js event-loop delay, heap usage, garbage-collection pauses,
  process CPU, process memory, and crashes.
- **Logs and traces:** structured logs with service, level, and trace ID, plus
  distributed traces that identify where slow or failed operations spent time.
- **Business outcomes:** orders placed, payments completed, reservations
  confirmed, and other domain-specific success or failure counters.

A useful starting model is the four golden signals: **traffic, latency, errors,
and saturation**. CPU alone says that a machine is busy; combining these signals
shows whether that work is affecting users and where the bottleneck is.
