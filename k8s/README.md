# Kubernetes Deployment

This folder contains Kubernetes manifests for running the Task Manager on a
local Kubernetes cluster (minikube, kind, or Docker Desktop's built-in K8s).

## Files

| File                   | What it creates                                        |
|------------------------|--------------------------------------------------------|
| `00-namespace.yaml`    | A `task-manager` namespace                             |
| `01-db-config.yaml`    | ConfigMap + Secret for DB credentials                  |
| `02-db.yaml`           | Postgres StatefulSet + Service + PersistentVolumeClaim |
| `03-backend.yaml`      | Backend Deployment (2 replicas) + Service              |
| `04-frontend.yaml`     | Frontend Deployment (2 replicas) + Service             |
| `05-ingress.yaml`      | Ingress exposing the frontend                          |
| `06-hpa.yaml`          | HorizontalPodAutoscaler for the backend                |

## Prerequisites

- A local Kubernetes cluster — pick one:
  - [minikube](https://minikube.sigs.k8s.io/)
  - [kind](https://kind.sigs.k8s.io/)
  - Docker Desktop (enable Kubernetes in Settings)
- `kubectl` installed and pointing at your cluster

Verify it's working:

```bash
kubectl cluster-info
kubectl get nodes
```

## Step 1: Build the images into the cluster

Kubernetes pulls images from a registry by default. For local development
you have a few options:

### Option A — minikube

```bash
# Point your shell's docker at minikube's internal daemon
eval $(minikube docker-env)

# Now "docker build" puts images directly into the cluster
docker build -t task-manager-backend:local  ./backend
docker build -t task-manager-frontend:local ./frontend
```

### Option B — kind

```bash
docker build -t task-manager-backend:local  ./backend
docker build -t task-manager-frontend:local ./frontend

kind load docker-image task-manager-backend:local
kind load docker-image task-manager-frontend:local
```

### Option C — Docker Desktop Kubernetes

Just build normally — Docker Desktop's Kubernetes uses the same image store:

```bash
docker build -t task-manager-backend:local  ./backend
docker build -t task-manager-frontend:local ./frontend
```

## Step 2: Apply the manifests

From the project root:

```bash
kubectl apply -f k8s/
```

Watch the pods come up:

```bash
kubectl get pods -n task-manager -w
```

You should end up with something like:

```
NAME                        READY   STATUS    RESTARTS   AGE
backend-7f9c8b5d4-abc12     1/1     Running   0          30s
backend-7f9c8b5d4-def34     1/1     Running   0          30s
db-0                        1/1     Running   0          45s
frontend-6d5b7c9f8-ghi56    1/1     Running   0          30s
frontend-6d5b7c9f8-jkl78    1/1     Running   0          30s
```

## Step 3: Access the app

### Option A — port-forward (simplest, works everywhere)

```bash
kubectl port-forward -n task-manager svc/frontend 8080:80
```

Then open **http://localhost:8080**.

### Option B — Ingress

If you have an ingress controller (e.g. `ingress-nginx`) installed:

```bash
# Add a hostname entry. On Linux/macOS:
echo "127.0.0.1 task-manager.local" | sudo tee -a /etc/hosts

# For minikube, in a separate terminal:
minikube tunnel
```

Then open **http://task-manager.local**.

## Useful commands

```bash
# See everything
kubectl get all -n task-manager

# Describe a pod (great for debugging stuck pods)
kubectl describe pod -n task-manager <pod-name>

# Tail backend logs across all replicas
kubectl logs -n task-manager -l app=backend -f

# Shell into the database
kubectl exec -it -n task-manager db-0 -- psql -U app -d tasks

# Manually scale the backend
kubectl scale deployment backend -n task-manager --replicas=4

# Roll out a new backend image
kubectl set image deployment/backend -n task-manager \
  backend=task-manager-backend:v2

# Watch the rollout
kubectl rollout status deployment/backend -n task-manager

# Roll back to the previous version
kubectl rollout undo deployment/backend -n task-manager

# Tear everything down
kubectl delete namespace task-manager
```

## What's different vs. docker-compose

| Concern              | docker-compose                    | Kubernetes                                |
|----------------------|-----------------------------------|-------------------------------------------|
| Service discovery    | Hostname = service name in YAML   | Hostname = Service name in the namespace  |
| Health checks        | `healthcheck:`                    | `livenessProbe` + `readinessProbe`        |
| Persistent storage   | Named volume                      | PersistentVolumeClaim                     |
| Scaling              | `deploy.replicas` (Swarm only)    | `replicas:` + HorizontalPodAutoscaler     |
| External access      | `ports:` publishing to host       | `Service` (ClusterIP/NodePort/LoadBalancer) + Ingress |
| Secrets              | Environment variables in YAML     | `Secret` resources                        |
| Restarts on failure  | `restart: unless-stopped`         | Automatic — the controller's whole job    |
| Rolling updates      | Manual                            | Built in (`kubectl rollout`)              |
