# AWS EKS deployment learning plan

## Goal

Build a complete, repeatable delivery system for the Awilixify example platform.
Start with a local Kubernetes cluster, prove the deployment and rollback flow
there, and then reproduce the same design on AWS EKS.

The finished path should be:

```text
pull request
  -> lint, typecheck, test, and build
  -> build and scan container images once
  -> store immutable images and metadata
  -> deploy the exact image digests with Helm
  -> run smoke and runtime checks
  -> roll back automatically when a deployment is unhealthy
```

`main` is the stable staging baseline. Later, each pull request can receive an
isolated preview namespace. An AI-assisted debugging workflow can then inspect
staging traces, create a fix, and verify the fix against its preview.

This is a learning environment, not a production platform. The primary purpose
is to move beyond application development and gain practical infrastructure and
DevOps experience. It should teach the full lifecycle without adding high
availability, a service mesh, or multiple clusters before they solve a real
problem.

## Learning outcomes

By the end, be able to explain and operate—not only configure—the following:

- Kubernetes workloads, Services, DNS, Ingress, configuration, secrets,
  storage, scheduling, probes, requests/limits, scaling, and rollbacks;
- `kubectl`, Helm, a terminal UI, a web UI, and common troubleshooting flows;
- live and historical CPU/memory usage, dashboards, alerts, logs, and resource
  sizing;
- Docker image construction, scanning, provenance, registries, and promotion;
- Terraform state and lifecycle, AWS networking, IAM/OIDC, ECR, EKS, DNS, TLS,
  costs, and teardown;
- RabbitMQ topology, persistence, resource alarms, recovery, upgrades, and the
  difference between self-managed and managed brokers;
- CI/CD design from a pull-request check through deployment and runtime
  verification.

Tools are introduced in layers. Each tool must answer a concrete operational
question or enable an exercise; installing many dashboards without using them
is not a milestone.

## Source repositories and published artifacts

The projects are now independent published repositories. The example platform
uses their released packages and image directly:

| Project          | Source                                                                                            | Published artifact used here                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Example platform | [wildstyles/awilixify-example-platform](https://github.com/wildstyles/awilixify-example-platform) | Images built by this repository                                                     |
| Awilixify        | [awilixify/awilixify](https://github.com/awilixify/awilixify)                                     | [`awilixify`](https://www.npmjs.com/package/awilixify) `^3.2.0`                     |
| CLI              | [awilixify/awilixify-cli](https://github.com/awilixify/awilixify-cli)                             | [`@awilixify/cli`](https://www.npmjs.com/package/@awilixify/cli) `^0.1.0`           |
| DevTools API     | [awilixify/awilixify-devtools](https://github.com/awilixify/awilixify-devtools)                   | [`@awilixify/devtools`](https://www.npmjs.com/package/@awilixify/devtools) `^0.2.0` |
| DevTools UI      | [awilixify/awilixify-devtools-ui](https://github.com/awilixify/awilixify-devtools-ui)             | `ghcr.io/awilixify/awilixify-devtools-ui:0.1.1`                                     |

Versions above reflect the current `package.json` and `compose.yaml`. Update
them through normal dependency upgrades; deployment work does not require the
source repositories to be checked out together.

## Current platform facts

- The repository is a pnpm workspace managed by Turborepo.
- Orders serves HTTP on `3000`; Warehouse serves HTTP on `3001`.
- Their embedded DevTools APIs listen on `3221` and `3223`.
- The separate DevTools UI listens on `3222` and proxies those APIs.
- Both services use separate RabbitMQ host, port, username, and password values.
  Local development uses host port `5673`; Kubernetes uses the Service on `5672`.
- Orders uses `WAREHOUSE_API_URL` to call Warehouse.
- Orders, inventory, and DevTools traces are process-local. Traces can be
  written to `.awilixify-devtools/traces.json`, but the applications have no
  durable database.
- Production builds, validated configuration, health endpoints, and graceful
  shutdown are now present. Dockerfiles, Helm charts, Terraform, and GitHub
  workflows still need to be added.

Because application and trace state are process-local, begin with one replica
of each API. Scaling comes after storage and trace routing are redesigned.

## Architecture

Use one local cluster for rehearsal and one EKS cluster for remote staging and
previews. A pull request gets a namespace, not another EKS cluster.

```text
GitHub Actions
  |-- checks
  |-- image build, SBOM, provenance, scan, and push
  |-- staging/preview Helm deployment
  `-- smoke checks and rollback

AWS
  |-- ECR
  |    |-- awilixify/orders-api
  |    |-- awilixify/warehouse-api
  |    `-- awilixify/devtools-ui (optional mirror of the GHCR image)
  |-- EKS: awilixify-learning
  |    |-- staging
  |    `-- preview-pr-<number>
  |-- Application Load Balancer, Route 53, and ACM
  |-- Amazon MQ for RabbitMQ (first managed-service comparison)
  |-- Secrets Manager or Parameter Store
  `-- CloudWatch and AWS Budgets
```

Ownership stays simple:

- Terraform owns AWS infrastructure and cluster add-ons.
- Helm owns application workloads inside Kubernetes.
- Pinned add-on releases install shared tools such as Metrics Server,
  Prometheus, Grafana, and the RabbitMQ operators.
- GitHub Actions coordinates checks, images, deployment, verification, and
  rollback.
- The Awilixify trace-debugging skill defines the runtime diagnostic method.

## Repository layout

Introduce this structure as the phases require it:

```text
.
|-- apps/
|-- packages/
|-- docker/
|    |-- Dockerfile.service
|    `-- .dockerignore
|-- charts/awilixify-platform/
|    |-- Chart.yaml
|    |-- values.yaml
|    |-- values-local.yaml
|    |-- values-staging.yaml
|    |-- values-preview.yaml
|    `-- templates/
|-- kubernetes/addons/
|    |-- local/
|    `-- staging/
|-- infra/
|    |-- bootstrap/
|    `-- environments/staging/
|-- .github/
|    |-- workflows/
|    `-- codex/fix-from-trace.md
`-- docs/runbooks/
```

## Phase 1: make the applications deployable

### Production builds

1. Add `build` scripts and `tsconfig.build.json` files for the RabbitMQ package
   and both APIs.
2. Emit JavaScript and source maps into `dist/`.
3. Export the RabbitMQ package from its compiled entry point.
4. Add a root `build` script and declare build outputs/dependencies in
   `turbo.json`.
5. Verify the compiled services run with Node, without `tsx`.

### Runtime behavior

Move deployment-specific values into validated environment variables:

```text
NODE_ENV
SERVICE_NAME
DEPLOYMENT_ENVIRONMENT
HTTP_HOST
HTTP_PORT
PUBLIC_APP_URL
DEVTOOLS_HOST
DEVTOOLS_PORT
DEVTOOLS_TRACE_HISTORY_FILE
RABBITMQ_HOST
RABBITMQ_PORT
RABBITMQ_USERNAME
RABBITMQ_PASSWORD
WAREHOUSE_API_URL
COMMIT_SHA
IMAGE_VERSION
SHUTDOWN_TIMEOUT_MS
```

Add:

- `/health/live`, which only proves the process is alive;
- `/health/ready`, which checks dependencies required to accept traffic;
- release metadata containing the commit, image version, and environment;
- graceful `SIGTERM` handling for HTTP and RabbitMQ;
- deterministic demo fixtures and a documented reset procedure.

Set `COMMIT_SHA` and `IMAGE_VERSION` in the image-build/deployment workflow and
set `DEPLOYMENT_ENVIRONMENT` in the Helm values for each environment. Kubernetes
does not infer this release metadata from the image, so the Deployment should
pass the three values to each container as environment variables.

RabbitMQ may be part of readiness because both services publish and consume
messages. Do not make Orders readiness depend on Warehouse HTTP availability;
that would spread a Warehouse outage to all Orders pods.

### Exit criteria

- `pnpm install --frozen-lockfile`, lint, typecheck, and build pass from a clean
  checkout.
- Both compiled applications start with Node.
- Deployed configuration can replace every cross-service `localhost` default
  with a Kubernetes Service or managed-service endpoint.
- Probes and graceful shutdown work locally.

## Phase 2: build production containers

Use one parameterized multi-stage Dockerfile, or two small Dockerfiles sharing
the same stages. Produce separate Orders and Warehouse images.

Each image must:

- use a pinned Node 22 base image and the repository's pinned pnpm version;
- install with `pnpm install --frozen-lockfile`;
- build only the service and its workspace dependencies;
- contain production dependencies, compiled output, and source maps;
- run as a non-root user with a correct PID 1 strategy;
- contain OCI source, revision, and version labels;
- exclude secrets, Git data, caches, test data, and local traces;
- accept environment-specific URLs and secrets only at runtime.

Build locally first. Extend Compose so the production images, RabbitMQ, and the
published DevTools UI run together before Kubernetes is introduced.

Use immutable identities:

```text
sha-<git-sha>
main-<git-sha>
v<semver>       # explicit releases only
```

Prefer deployment by digest. Never use `latest` as a release identity.

### Exit criteria

- Both images build from a clean checkout and run as non-root.
- The production Compose stack passes a basic Orders-to-Warehouse-to-RabbitMQ
  scenario.
- No image contains credentials or local trace history.

## Phase 3: reproduce the platform in local Kubernetes

This is the first complete deployment target. Use `kind` as the documented
default so the team has one reproducible path; `k3d` may be added later.

### Build the Helm chart

Start with one chart containing:

- Orders Deployment and Service on `3000` and internal DevTools port `3221`;
- Warehouse Deployment and Service on `3001` and internal DevTools port `3223`;
- DevTools UI Deployment and Service on `3222`;
- ConfigMaps, Secret references, probes, resource limits, and security contexts;
- optional PVCs for per-service trace history;
- Ingress enabled by environment values.

Install cluster-wide software as separate, pinned add-on releases. Do not hide
Prometheus or the RabbitMQ operator inside the application chart.

Configure internal addresses through Kubernetes DNS:

```text
WAREHOUSE_API_URL=http://warehouse-api:3001
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
orders DevTools API=http://orders-api:3221
warehouse DevTools API=http://warehouse-api:3223
```

Keep ports `3221` and `3223` private. Only the DevTools UI/reverse proxy should
reach them.

Safe chart defaults include one API replica, CPU/memory requests and limits,
startup/readiness/liveness probes, non-root containers, no privilege
escalation, dropped capabilities, and a suitable termination grace period.
With one ReadWriteOnce trace volume, use `Recreate` or
`maxSurge: 0`/`maxUnavailable: 1` to avoid volume multi-attach failures.

### Learn to manage and observe the local cluster

Begin with Kubernetes' own tools, then add dashboards:

1. Use `kubectl get`, `describe`, `logs`, `events`, `exec`, `top`,
   `port-forward`, `rollout`, and `auth can-i` until their roles are clear.
2. Install Metrics Server and inspect live node, pod, and container CPU/memory
   with `kubectl top`. These values are point-in-time, not history.
3. Try [K9s](https://k9scli.io/) as a terminal UI and
   [Headlamp](https://headlamp.dev/) as a Kubernetes web UI. Use them to inspect
   the same objects previously examined with `kubectl`.
4. Install a small local `kube-prometheus-stack`: Prometheus, Grafana,
   kube-state-metrics, node-exporter, and Alertmanager. Keep retention short and
   persistence optional so it fits on a laptop.
5. Compare actual CPU/memory with requests and limits in Grafana. Add a
   ServiceMonitor and an alert rather than relying only on bundled dashboards.
6. Try Goldilocks/VPA in recommendation-only mode after enough usage history
   exists. Treat its suggestions as evidence to review, not automatic truth.
7. Use Trivy to scan the local cluster for image vulnerabilities and Kubernetes
   misconfiguration. Add continuous in-cluster scanning only after the CLI
   report is understood.

Useful local experiments:

- generate traffic and watch CPU, memory, latency, and RabbitMQ queue depth;
- set an unrealistically low CPU limit and observe throttling;
- set an unrealistically low memory limit and diagnose `OOMKilled` and restart
  behavior;
- configure an HPA and watch replicas change under load;
- delete pods and observe reconciliation and service availability;
- break readiness, image names, DNS, and configuration one at a time and use
  events/logs/metrics to find the cause;
- compare requested resources, actual usage, and node allocatable capacity.

Local numbers reflect the laptop/Docker runtime rather than EC2 performance,
but Kubernetes objects, dashboards, PromQL, alerts, and troubleshooting methods
transfer directly to EKS.

### Learn to manage RabbitMQ locally

Use the official RabbitMQ Cluster Kubernetes Operator rather than treating the
broker as an opaque application dependency:

1. Install a pinned operator version as a cluster add-on.
2. Create a single-node `RabbitmqCluster` with a small PVC for the first local
   milestone; later try three nodes if the laptop has enough resources.
3. Access the management UI only through port-forwarding.
4. Learn `rabbitmqctl`, `rabbitmq-diagnostics`, and `rabbitmqadmin` for cluster,
   queue, connection, memory, alarm, and health inspection.
5. Scrape the operator-enabled Prometheus endpoint with a ServiceMonitor and
   import RabbitMQ's maintained Grafana dashboards and alert rules.
6. Add the RabbitMQ Messaging Topology Operator later to manage virtual hosts,
   users, permissions, policies, exchanges, and queues declaratively. Keep
   generated credentials in Secrets.

Practice:

- stop and resume consumers and observe ready/unacknowledged message counts;
- create a backlog and compare publish, delivery, acknowledgment, and consumer
  rates;
- restart the broker pod and prove durable messages survive on the PVC;
- inspect memory and disk watermarks, file descriptors, connections, channels,
  node health, and quorum status;
- configure publisher confirms, dead-lettering, TTL, and bounded queues;
- perform a controlled operator/RabbitMQ upgrade and document rollback and
  recovery steps.

### Local rehearsal

1. Create a multi-node `kind` cluster from a committed configuration.
2. Install the selected local add-ons and verify their versions and health.
3. Build and load the Orders and Warehouse images into it.
4. Create the local RabbitMQ cluster.
5. Install the application chart in `staging` with `values-local.yaml`.
6. Run smoke checks for HTTP, RabbitMQ messaging, DevTools, and trace writing.
7. Test a rolling change, pod restart, graceful termination, and persistence.
8. Deploy a deliberately broken probe and demonstrate automatic and manual
   rollback.
9. Provide one script or Make target to create the cluster and one to tear it
   down.

Use the same application chart later on EKS. Environment values may change
ingress, storage class, image registry, credentials, and whether RabbitMQ is an
in-cluster or external service; the application workload structure stays the
same.

### Exit criteria

- A new developer can create the full local cluster from documented commands.
- The complete platform works through Kubernetes Services, not host shortcuts.
- Metrics Server, Grafana, and the chosen management UIs show the local
  workloads and their resource use.
- RabbitMQ dashboards, alerts, CLI diagnostics, persistence, and recovery
  exercises work.
- `helm lint` and `helm template` pass for local, staging, and preview values.
- A failed release returns to the last healthy Helm revision.

## Phase 4: add CI and immutable image storage

### Pull-request checks

Create `checks.yml` to run:

1. `pnpm install --frozen-lockfile`;
2. lint;
3. typecheck;
4. tests when the repository introduces an automated test suite;
5. production build;
6. container build without push;
7. `helm lint` and `helm template`;
8. Terraform format, validate, and security checks when infrastructure exists.

Make the workflow a required branch check.

### Image workflow

After checks succeed on `main`:

1. authenticate to AWS through GitHub OIDC;
2. build Orders and Warehouse with Docker Buildx;
3. generate an SBOM and provenance;
4. scan the images and fail on critical vulnerabilities unless an exception is
   recorded;
5. push SHA-tagged images to their ECR repositories;
6. record image digests, commit SHA, build run, and scan result as workflow
   outputs and artifacts.

For each `main` commit, build once in the publishing workflow and promote the
same digest to staging and previews. A developer's earlier local build is only
a rehearsal artifact and is not promoted.

The DevTools UI is built in its own repository and published to GHCR. Pin it by
digest in the chart. As an AWS learning exercise, add a controlled mirror job
that copies the approved UI digest into ECR; do not rebuild its source in the
example-platform workflow.

Enable ECR tag immutability, scanning, and lifecycle rules so staging/release
images remain available while old untagged and preview images expire.

### Exit criteria

- No image is pushed unless required checks pass.
- Every deployed image maps to a source commit and build record.
- A deployment consumes recorded digests, never an ambiguous tag.

## Phase 5: prepare the AWS learning account

Complete these guardrails before creating EKS resources:

1. Use a dedicated AWS sandbox account when possible.
2. Enable root-user MFA and use IAM Identity Center or a limited administrator
   role for daily work.
3. Create AWS Budget warnings and a hard personal decision threshold before
   provisioning the cluster. Also enable Cost Anomaly Detection.
4. Choose a region, such as `eu-central-1`, but keep it configurable.
5. Decide whether DNS will be created now. HTTPS hostnames can be deferred until
   the cluster works through port-forwarding or a temporary endpoint.
6. Document teardown and expected recurring costs.

Suggested budget notifications are USD 25, USD 75, and the chosen maximum, but
set values that are meaningful for the account.

### Exit criteria

- Budget notifications reach the owner.
- A non-root identity can administer the sandbox.
- Region, cost limit, teardown owner, and initial DNS decision are recorded.

## Phase 6: provision AWS with Terraform

### State bootstrap

Create a small bootstrap configuration for an encrypted, versioned S3 state
bucket and a narrowly scoped Terraform GitHub Actions role. Use the S3 backend's
`use_lockfile` support. Do not keep authoritative state only on a laptop or in
Git.

### Staging infrastructure

Provision:

1. a VPC across at least two availability zones;
2. public subnets for load balancers and private subnets for workers;
3. one NAT Gateway for the learning environment, accepting the availability
   trade-off and cost;
4. an EKS cluster on a currently supported Kubernetes version;
5. one small managed node group with explicit autoscaling bounds;
6. ECR repositories, scan settings, and lifecycle policies;
7. EKS access entries for the human administrator and deployment role;
8. GitHub OIDC and separate least-privilege roles for image push, Terraform,
   and Helm deployment;
9. AWS Load Balancer Controller and EBS CSI permissions/add-ons;
10. Route 53 and ACM only when public HTTPS is introduced;
11. Secrets Manager or Parameter Store entries, without committing values;
12. a private Amazon MQ for RabbitMQ broker for the managed-service exercise;
13. consistent project, environment, owner, and purpose tags.

Start with a public EKS API endpoint protected by IAM and tightly scoped access
entries so GitHub-hosted runners can deploy. A later hardening exercise can use
a private endpoint and a runner inside the VPC.

Pull requests run format, validation, static/security checks, and `terraform
plan`. Apply only from protected `main` or a manually approved GitHub
Environment. Pin Terraform, provider, and module versions and commit the lock
file. Require approval for destructive applies.

Terraform creates durable infrastructure and cluster add-ons. It does not own
the application Helm release.

### Compare managed and Kubernetes-operated RabbitMQ

Use both models as learning exercises, but do not pay for both continuously:

1. **Local Kubernetes:** operate RabbitMQ with the official Cluster Operator as
   described in Phase 3. This teaches stateful workloads, storage, operators,
   upgrades, failure recovery, and Prometheus monitoring.
2. **First AWS staging:** provision Amazon MQ for RabbitMQ with Terraform in
   private subnets and allow AMQP only from the EKS workloads. Begin with a
   cost-conscious single-instance learning broker, then deliberately try a
   clustered deployment if the availability exercise justifies the cost.
3. **Optional comparison:** temporarily run the same RabbitMQ Cluster Operator
   on EKS with EBS-backed storage. Repeat the failure and upgrade runbooks, then
   compare operational work, visibility, recovery, flexibility, and cost with
   Amazon MQ before destroying one model.

For Amazon MQ, AWS operates the broker hosts, storage integration, maintenance,
and version upgrades. The team still owns topology, users, permissions, client
reconnection, publisher confirms, queue policies, capacity, alarms, and
application failure handling.

Keep broker selection outside application code. Local values supply the
Kubernetes Service host and port; AWS values supply the private Amazon MQ
endpoint. Credentials come from a Secret in both cases. Never expose AMQP or the
management UI publicly.

### Exit criteria

- Terraform plus the documented bootstrap can reproduce the environment.
- GitHub uses OIDC; no permanent AWS access keys are stored in GitHub.
- The cluster is reachable by the approved human and deployment role.
- Destruction has been rehearsed on a disposable stack and costs return to the
  expected baseline.

## Phase 7: deploy and verify EKS staging

Install the same chart and digests proven in the local cluster:

```sh
helm upgrade --install awilixify-platform charts/awilixify-platform \
  --namespace staging \
  --create-namespace \
  --values charts/awilixify-platform/values-staging.yaml \
  --atomic \
  --wait \
  --timeout 10m \
  --history-max 10
```

The staging workflow should authenticate with OIDC, update kubeconfig, render
the chart, deploy exact digests, wait for rollout, and run non-destructive smoke
checks. Record the Helm revision, all image digests, commit SHA, URLs, workflow
run, and deployment time in the GitHub deployment summary.

Use a protected `staging` GitHub Environment and deployment concurrency. Begin
with manual approval while learning.

Test both failure paths:

- `--atomic` restores the previous release after an unhealthy upgrade;
- a manual workflow lists Helm history and rolls back a selected revision.

### Exit criteria

- `main` corresponds to one known staging Helm revision.
- The commit can be traced through CI, ECR digest, and Kubernetes Deployment.
- Smoke checks gate successful deployment status.
- Automatic and manual rollback are demonstrated.

## Phase 8: secure and observe staging

Add these progressively after the first working EKS deployment:

- HTTPS through ACM and the AWS Load Balancer Controller;
- RabbitMQ and DevTools credentials in Secrets Manager or Parameter Store,
  synchronized through an audited mechanism;
- authentication for the DevTools UI and a separate read-only trace credential;
- redaction and retention rules for traces, which may contain application data;
- NetworkPolicies for ingress, Orders-to-Warehouse, RabbitMQ, DNS, and DevTools;
- structured stdout logs and CloudWatch retention limits;
- metrics/alerts for errors, latency, restarts, queue depth, node pressure, and
  failed deployments.

Run the Kubernetes Prometheus/Grafana dashboards on EKS once to compare them
with local results. Then evaluate whether to retain that stack or use AWS
managed monitoring components. For Amazon MQ, create CloudWatch dashboards and
alarms for CPU, memory and disk limits, connections, consumers, queue depth,
unacknowledged messages, and publish/acknowledgment rates. When the selected
broker version supports its Prometheus endpoints, scrape them into the same
Grafana view used for the applications.

Keep RabbitMQ, its management UI, and embedded DevTools API ports private. The
AI credential must not invoke providers, clear history, delete traces, or use
administrative endpoints. If DevTools cannot enforce that boundary, place an
authenticated read-only gateway in front of the required GET endpoints.

### Exit criteria

- Public endpoints use HTTPS and unauthenticated DevTools requests fail.
- Secrets do not appear in Git, Helm values, workflow logs, or traces.
- Alerts and log retention are configured and tested.
- The read-only trace credential cannot mutate application or DevTools state.

## Phase 9: add pull-request previews

Do this only after staging and rollback are reliable.

For each authorized pull request, deploy `preview-pr-<number>` in the existing
cluster. Reuse an existing image digest for the PR commit when available. Give
the preview unique hosts, labels, expiry metadata, trace identity, and RabbitMQ
isolation through a vhost/queue prefix or dedicated RabbitMQ release.

The application state is already isolated because it is in memory. If a
database is added, use a database branch/snapshot or schema per preview. Never
run preview migrations against the shared staging schema.

On pull-request close, uninstall the release and remove the namespace, data,
secrets, messaging resources, and non-wildcard DNS records. Add a scheduled
janitor for previews older than their TTL.

### Exit criteria

- Two previews cannot consume each other's messages or state.
- Preview metadata identifies its pull request and exact commit.
- Closing a pull request removes its billable resources.

## Phase 10: add the AI trace-debugging loop

Only automate this after several manual trace-debugging exercises succeed
against staging.

1. Commit the generated skill at
   `.agents/skills/awilixify-trace-debugging/SKILL.md`.
2. Add `.github/codex/fix-from-trace.md` with strict scope: staging and its
   read-only trace API, smallest relevant patch, no deployment or merge.
3. Trigger `openai/codex-action` only from a maintainer-controlled `ai-fix`
   label.
4. Treat issue content as untrusted input and provide only the OpenAI key,
   staging URL, and read-only trace credential.
5. Create `codex/issue-<number>` and a draft pull request, or report a useful
   blocker.

The AI job receives no AWS deployment, Kubernetes, RabbitMQ, or mutable
DevTools credentials. Normal pull-request checks remain the gate.

After the preview deploys, a separate verifier should:

1. confirm that the preview reports the pull-request commit SHA;
2. replay the failure with a unique correlation ID;
3. retrieve that exact preview trace;
4. compare response, spans, downstream calls, events, and side effects with the
   staging baseline;
5. run a healthy control case;
6. post a structured report and required runtime-verification result.

The first verifier only reports evidence; it does not edit code.

### Exit criteria

- A trusted issue produces a trace-backed draft pull request or clear blocker.
- The preview verification records the exact commit, request, response, and
  trace IDs.
- Runtime verification cannot pass solely because static checks passed.

## Milestones

### A. Deployable application and images

- [ ] Clean install, lint, typecheck, and production build pass.
- [ ] Compiled services run with Node and shut down gracefully.
- [ ] Health and release metadata endpoints work.
- [ ] Production images run as non-root and contain no secrets.
- [ ] Production Compose smoke test passes.

### B. Local Kubernetes reproduction

- [ ] One command creates the documented `kind` cluster.
- [ ] Helm installs the complete platform with local values.
- [ ] HTTP, messaging, DevTools, and trace persistence checks pass.
- [ ] `kubectl top`, K9s, Headlamp, and Grafana show resource use and workload
      state.
- [ ] CPU throttling, OOM recovery, HPA, broken readiness, and pod replacement
      have been observed and explained.
- [ ] The RabbitMQ operators, CLI tools, management UI, dashboards, alerts,
      persistence, and recovery runbooks have been exercised.
- [ ] Failed upgrade and manual rollback are demonstrated.

### C. CI and stored artifacts

- [ ] Required checks gate image publication.
- [ ] ECR stores immutable application image digests.
- [ ] SBOM, provenance, scan result, source commit, and digest are recorded.
- [ ] Lifecycle rules preserve releases and expire disposable images.

### D. Reproducible EKS staging

- [ ] Budget alerts and Terraform remote state are configured.
- [ ] VPC, EKS, ECR, IAM/OIDC, DNS/TLS, and storage are infrastructure as code.
- [ ] The same Helm chart deploys exact digests to EKS.
- [ ] Staging smoke tests, automatic rollback, and manual rollback work.
- [ ] DevTools is authenticated and observable.
- [ ] Amazon MQ is private, observable, and compared with operator-managed
      RabbitMQ using documented trade-offs.

### E. Preview and AI verification

- [ ] Pull-request previews are isolated and cleaned up automatically.
- [ ] A maintainer-triggered AI job can read traces but cannot deploy or mutate.
- [ ] Preview verification posts before/after runtime evidence.

## Deferred until required

- multiple application replicas and centralized trace storage;
- production-grade RabbitMQ high availability;
- multi-region or separate clusters per environment;
- service mesh or GitOps controllers;
- automatic merge or production deployment of AI changes.

Centralized trace storage is the first item to revisit before increasing either
API above one replica.

## References

### Project repositories and artifacts

- [Awilixify example platform](https://github.com/wildstyles/awilixify-example-platform)
- [Awilixify](https://github.com/awilixify/awilixify)
- [Awilixify CLI](https://github.com/awilixify/awilixify-cli)
- [Awilixify DevTools](https://github.com/awilixify/awilixify-devtools)
- [Awilixify DevTools UI](https://github.com/awilixify/awilixify-devtools-ui)
- [DevTools UI container package](https://github.com/awilixify/awilixify-devtools-ui/pkgs/container/awilixify-devtools-ui)

### Platform documentation

- [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [K9s](https://k9scli.io/)
- [Headlamp](https://headlamp.dev/docs/latest/)
- [Goldilocks resource recommendations](https://goldilocks.docs.fairwinds.com/)
- [Trivy Kubernetes scanning](https://www.trivy.dev/docs/latest/tutorials/kubernetes/cluster-scanning/)
- [Helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)
- [RabbitMQ Kubernetes Operators](https://www.rabbitmq.com/kubernetes/operator/operator-overview)
- [Monitoring operator-managed RabbitMQ](https://www.rabbitmq.com/kubernetes/operator/operator-monitoring)
- [RabbitMQ monitoring](https://www.rabbitmq.com/docs/monitoring)
- [Amazon EKS cluster creation](https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html)
- [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/)
- [Amazon ECR](https://docs.aws.amazon.com/ecr/)
- [Amazon MQ overview](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/welcome.html)
- [Amazon MQ for RabbitMQ metrics](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-logging-monitoring.html)
- [Amazon MQ Prometheus metrics](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-prometheus-metrics.html)
- [AWS Load Balancer Controller installation](https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html)
- [GitHub Actions OIDC for AWS](https://docs.github.com/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3)
- [Codex GitHub Action](https://developers.openai.com/codex/github-action)

- blue/green deployments
- cloudflare
- zabbix
