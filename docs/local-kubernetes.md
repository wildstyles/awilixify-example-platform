# Local Kubernetes overview

This document explains the main tools and objects used to run an application
on a local Kubernetes cluster. It focuses on concepts rather than installation
or project-specific commands.

## Kubernetes

Kubernetes manages containerized applications across one or more machines. An
application declares its desired state, and Kubernetes continuously works to
maintain that state.

For example, the desired state can say that an application must have two
running instances. If one instance exits or its node disappears, Kubernetes
creates a replacement.

Kubernetes is composed of a control plane and nodes:

```text
Control plane
├── API server
├── scheduler
├── controllers
└── state storage

Nodes
├── container runtime
├── kubelet
└── application workloads
```

The API server is the central interface. Command-line tools, dashboards, Helm,
and automated deployment systems all communicate with the Kubernetes API.

## Local clusters and Minikube

A Kubernetes node needs a Linux environment and several configured components,
including networking, DNS, storage, certificates, and a container runtime.
Local-cluster tools automate this setup.

Minikube creates a real Kubernetes cluster for local development and learning.
It normally runs the node inside a virtual machine or container and manages the
cluster lifecycle as one isolated profile.

A local cluster accurately represents core Kubernetes behavior such as Pods,
Deployments, Services, configuration, health probes, resource limits, and
rollouts. Cloud-specific features such as AWS identity, load balancers,
networks, and storage still need to be tested in the target cloud.

## Kubernetes resources

Kubernetes configuration consists of resources submitted to the API server.
Each resource describes part of the desired state.

### Pod

A Pod is the smallest deployable Kubernetes unit. It usually contains one
application container.

Pods are temporary. Kubernetes can delete and replace them, so applications
should not rely on a Pod name, IP address, or writable container filesystem
remaining available permanently.

### Deployment

A Deployment manages a set of identical application Pods. It defines:

- The container image
- The desired number of replicas
- Environment configuration
- Health probes
- CPU and memory requests and limits
- Volumes
- The update strategy

When its Pod template changes, the Deployment performs a controlled rollout.
If a Pod fails, the Deployment creates a replacement.

### Service

Pod IP addresses change when Pods are replaced. A Service provides a stable DNS
name and virtual address in front of matching Pods.

```text
Client
  │
  ▼
Service: stable name and port
  │
  ├── Pod A
  ├── Pod B
  └── Pod C
```

Services select Pods through labels. Applications communicate with another
application through its Service name rather than a Pod IP address.

The common Service types are:

- `ClusterIP`: reachable only inside the cluster
- `NodePort`: exposed through a port on every node
- `LoadBalancer`: exposed through an infrastructure load balancer

`ClusterIP` is the normal choice for communication between internal services.

### ConfigMap

A ConfigMap stores non-sensitive runtime configuration, such as hostnames,
ports, feature flags, and environment names.

A Pod can consume ConfigMap entries as environment variables or mounted files.
Changing a ConfigMap does not automatically guarantee that an existing process
reloads its configuration; many applications require a Pod restart.

### Secret

A Secret has an interface similar to a ConfigMap but represents sensitive data,
such as passwords, tokens, and private keys.

A Kubernetes Secret is not automatically a complete security solution. Access
must be restricted with RBAC, encryption at rest should be enabled, and mature
environments commonly synchronize values from an external secret manager.

### Namespace

A Namespace provides a logical boundary for resources. It helps separate
applications, environments, teams, access policies, and resource quotas within
one cluster.

### Health probes

Kubernetes uses probes to understand container health:

- A startup probe gives a slow-starting application time to initialize.
- A readiness probe determines whether a Pod should receive traffic.
- A liveness probe determines whether Kubernetes should restart the container.

Readiness and liveness answer different questions. An application can be alive
but temporarily unable to accept traffic.

### Resource requests and limits

A resource request tells the scheduler how much CPU and memory a container is
expected to need. A limit defines the maximum it may consume.

```text
request → scheduling and reserved capacity
limit   → runtime consumption boundary
```

CPU limits can cause throttling. Exceeding a memory limit can cause the
container to be terminated for using too much memory.

### Volumes

The writable container filesystem is temporary. Volumes provide storage with a
lifecycle appropriate to the data:

- `emptyDir` exists for the lifetime of a Pod.
- A persistent volume can survive Pod replacement.
- ConfigMaps and Secrets can also be mounted as read-only files.

## Helm

Kubernetes accepts YAML resource definitions, but maintaining many nearly
identical YAML files for different environments becomes repetitive. Helm is a
package manager and templating system for Kubernetes.

Helm combines templates and values, renders ordinary Kubernetes resources, and
submits them to the Kubernetes API as a release:

```text
Chart templates + values
          │
          │ render
          ▼
Kubernetes YAML resources
          │
          │ submit
          ▼
Kubernetes API
```

Kubernetes does not execute Helm templates. Helm renders them before sending
the result to Kubernetes.

Helm also tracks release revisions, which allows upgrades and rollbacks to be
managed as operations on one application release.

## Helm chart files

### Chart.yaml

`Chart.yaml` describes the chart itself. It contains its name, chart version,
type, description, and optional dependencies.

The chart version identifies the packaging and templates. It is separate from
the application or container-image version.

### values.yaml

`values.yaml` contains the default inputs used by templates. It is similar to
an environment configuration file, but its scope is broader.

Values can control:

- Image repositories and tags
- Replica counts
- Service ports
- Environment variables
- Health probes
- Resource requests and limits
- Volumes
- Optional components

Templates decide how each value becomes part of a Kubernetes resource.

Values can come from the chart defaults, additional values files, or explicit
overrides. More specific inputs override the defaults.

Values files are not a safe place for production credentials. Helm values may
appear in source control, logs, command history, and Helm release data.

### templates

The `templates` directory contains parameterized Kubernetes resources. During
an install or upgrade, Helm evaluates the template expressions using the
selected values.

Subdirectories under `templates` are organizational only. All their rendered
resources remain part of the same chart and release.

### Helpers

Helper templates contain reusable naming, labels, and formatting logic. They
reduce duplication while keeping resource templates consistent.

## Single chart and umbrella chart

A single chart contains all resource templates for one release. An umbrella
chart declares other complete charts as dependencies.

| Single chart | Umbrella chart with subcharts |
| --- | --- |
| One chart and release structure | Parent chart composes child charts |
| Values and helpers are shared directly | Each child has its own values and helpers |
| Components normally change together | Components can be versioned independently |
| Less dependency machinery | Supports chart reuse and independent ownership |

A single chart is usually appropriate when components belong to one platform,
are deployed together, and share a release lifecycle.

An umbrella chart becomes useful when components are reusable, independently
versioned, optionally installed, or owned by different teams. The `charts`
directory has this special dependency meaning and should not be used merely to
group template files visually.

## Configuration boundaries

Different configuration belongs at different layers:

| Configuration | Appropriate location |
| --- | --- |
| Image runtime defaults | Docker image |
| Deployment-specific non-sensitive settings | Helm values and ConfigMaps |
| Credentials and private keys | Secret manager and Kubernetes Secrets |
| Replica counts, probes, resources, volumes | Helm values and Deployments |
| Cloud infrastructure | Infrastructure-as-code tooling |

This separation allows one immutable image to run in multiple environments
without rebuilding it for each environment.

## Dashboards and metrics

A Kubernetes dashboard is another client of the Kubernetes API. It does not
replace Kubernetes resources or Helm.

Headlamp provides a graphical view of workloads, logs, events, configuration,
resource YAML, and relationships. It can run as a desktop application using a
kubeconfig or as an application inside a cluster. Its available operations are
controlled by Kubernetes RBAC.

Metrics Server supplies recent CPU and memory measurements used by resource
inspection tools. It is suitable for current usage but not long-term history.
Prometheus and Grafana are commonly added when historical dashboards, queries,
and alerts are needed.

Dashboard edits are useful for experiments, but lasting configuration should
be changed in the chart or its values. Otherwise, the next Helm upgrade can
replace manual changes.

## Overall lifecycle

The complete relationship is:

```text
Source code
    │
    ▼
Container image
    │
    ▼
Helm chart + environment values
    │
    ▼
Kubernetes API
    │
    ├── Deployment manages Pods
    ├── Service provides stable networking
    ├── ConfigMap supplies configuration
    ├── Secret supplies sensitive values
    └── probes and metrics report runtime health
```
