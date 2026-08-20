# EKS monitoring

Helmfile installs `kube-prometheus-stack` as the `monitoring` release in the
`monitoring` namespace. Prometheus collects Kubernetes, node, Pod, CPU, and
memory metrics; Grafana provides the bundled dashboards. Alertmanager and
persistent storage are disabled for this disposable learning cluster.

## Open Grafana

Connect `kubectl` to the running EKS cluster, then keep this command running:

```sh
kubectl port-forward --namespace monitoring \
  service/monitoring-grafana 3000:80
```

Open `http://localhost:3000` and sign in as `admin`. Terraform generated the
password in the persistent platform stack and stored it in AWS Secrets Manager.
External Secrets Operator copies it to Kubernetes; read that synchronized copy:

```sh
kubectl get secret monitoring-grafana-admin \
  --namespace monitoring \
  --output jsonpath='{.data.admin-password}' | base64 --decode
echo
```

Start with the bundled **Kubernetes / Compute Resources** dashboards for
cluster, node, namespace, and Pod CPU and memory usage.

The credential flow is:

```text
Terraform -> AWS Secrets Manager -> ExternalSecret -> Kubernetes Secret -> Grafana
```

Recreating EKS does not rotate the password because the Secrets Manager secret
and Terraform state belong to the persistent platform stack.

## Current scope

This setup does not expose Grafana publicly and creates no additional ALB. Its
Prometheus history and Grafana changes are ephemeral. The EKS destroy workflow
uninstalls the monitoring release before deleting the cluster.

Per-endpoint request rate and latency are not available yet. They require the
APIs to expose Prometheus HTTP metrics and the application chart to create a
`ServiceMonitor`.
