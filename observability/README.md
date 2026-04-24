# Observability Stack

This installs three tools using their official Helm charts:

- **Prometheus** — scrapes metrics from `/metrics` on every backend pod
- **Grafana** — dashboards for those metrics
- **Loki + Promtail** — centralised logs from every pod

## Install everything

```bash
# Add the Helm repos once
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana              https://grafana.github.io/helm-charts
helm repo update

kubectl create namespace monitoring

# 1. Prometheus + Grafana bundle (kube-prometheus-stack)
helm install kps prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f values-prometheus.yaml

# 2. Loki stack for logs (Loki + Promtail)
helm install loki grafana/loki-stack \
  -n monitoring \
  -f values-loki.yaml
```

## Access the UIs

```bash
# Grafana (default user: admin, password from secret below)
kubectl port-forward -n monitoring svc/kps-grafana 3001:80
# -> http://localhost:3001

# Get the Grafana admin password
kubectl -n monitoring get secret kps-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d && echo

# Prometheus (optional — you rarely need this directly)
kubectl port-forward -n monitoring svc/kps-kube-prometheus-stack-prometheus 9090:9090
```

## What you get

- **Built-in dashboards** for nodes, pods, deployments, and the Kubernetes control plane.
- **Custom dashboard** (`dashboards/task-manager.json`) for request rate, error rate, and p95 latency of the Task Manager backend.
- **Loki** as a log source in Grafana, queryable with LogQL:
  ```logql
  {namespace="task-manager", app="backend"} |= "error"
  ```

## How the backend is scraped

The Helm chart adds these annotations to backend pods:

```yaml
prometheus.io/scrape: "true"
prometheus.io/port:   "3000"
prometheus.io/path:   "/metrics"
```

`values-prometheus.yaml` tells Prometheus to honour those annotations, so any
pod annotated this way is automatically scraped — no ServiceMonitor required.
