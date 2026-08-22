# Kubernetes compute resources

## How much CPU does the EKS cluster have?

The current cluster has two `t3.medium` worker nodes. Each node has two vCPUs:

```text
2 nodes × 2 vCPUs = 4 vCPUs total
```

Kubernetes currently reports about `1930m` of allocatable CPU per node:

```text
1930m × 2 nodes = 3860m allocatable CPU
```

The difference between four complete cores and `3860m` is reserved for the
node operating system and Kubernetes components. Application, monitoring,
networking, and controller Pods share the allocatable capacity.

## What does `500m` CPU mean?

The `m` means millicores, not megahertz:

```text
1000m = 1 CPU core
 500m = 0.5 CPU core
 100m = 0.1 CPU core
```

Grafana may display the same values as decimal cores. For example, `0.06` cores
is `60m`, or about 6% of one core.

CPU resources are configured per container. A one-container Pod with a `500m`
limit can consume at most about half of one core. For a multi-container Pod,
the Pod total is the sum of its container values.

## What is the difference between a CPU request and limit?

- **Request:** the CPU capacity Kubernetes uses when deciding which node can
  accommodate the Pod. The container may use more when spare CPU is available.
- **Limit:** the maximum CPU time the container may use. Linux delays its work
  when it attempts to exceed this value.
- **Usage:** the CPU the container actually consumed during the measured time
  window.

For example, usage of `0.06` cores with a `0.5`-core limit is:

```text
0.06 / 0.5 × 100 = 12% of the CPU limit
```

## What is CPU throttling?

CPU throttling means the container wanted more CPU time than its configured
limit allowed. The work is delayed rather than the Pod being terminated.
Sustained throttling can increase HTTP latency, event-loop delay, queue
processing time, and timeouts.

- `0%` means the limit is not restricting the container.
- Short spikes can be harmless.
- Sustained throttling should be compared with response latency, error rate,
  replica count, and the configured limit.

## What does memory usage mean?

Memory usage is RAM consumed by the container or Pod, including the Node.js
heap, native buffers, loaded code, runtime overhead, and some filesystem cache.
It is not disk storage and changes while the application runs.

- **Request:** RAM reserved when Kubernetes schedules the Pod.
- **Limit:** maximum RAM the container may consume.
- **Working set:** actively used RAM and usually the most useful dashboard
  measurement.

CPU overuse is throttled. Memory behaves differently: when a container exceeds
its memory limit, Linux can terminate it with `OOMKilled`, after which
Kubernetes normally starts it again.

## Which Grafana dashboard should I use?

Use the dashboards from broadest to most specific:

```text
Cluster → Namespace → Namespace (Pods) → Pod
```

- **Cluster:** total resource usage and capacity across all nodes.
- **Namespace:** aggregate usage for one namespace.
- **Namespace (Pods):** compare Orders, Warehouse, RabbitMQ, and DevTools to
  identify which Pod consumes resources.
- **Pod:** inspect one Pod's usage, requests, limits, containers, throttling,
  network traffic, and restart history.

The Namespace (Pods) dashboard is primarily for comparing actual consumption.
The Pod dashboard presents requests and limits more clearly. Prometheus stores
the limit data regardless of which dashboard displays it.

Prometheus scrapes this cluster every 30 seconds, so Grafana is near-real-time,
not instantaneous. A five-second dashboard refresh does not create new samples
faster than the scrape interval.
