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
