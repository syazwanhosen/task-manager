# GitOps with Argo CD

## The GitOps idea

- The **git repo is the source of truth** for what should be running.
- Argo CD continuously compares the repo to the live cluster and reconciles any drift.
- You never `kubectl apply` in production — you `git push`, and Argo deploys.

## Install Argo CD once

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for it to be ready
kubectl -n argocd rollout status deployment/argocd-server

# Access the UI
kubectl port-forward svc/argocd-server -n argocd 8443:443
# -> open https://localhost:8443

# Initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

## Register this app

Once you've pushed this repository to GitHub (and updated `repoURL` in
`application.yaml`):

```bash
kubectl apply -f argocd/project.yaml
kubectl apply -f argocd/application.yaml
```

From this point on:

1. Make a change — e.g. bump `backend.replicaCount` in `values.yaml`
2. Commit and push
3. Argo detects the change within ~3 minutes (or immediately if you click Sync)
4. Argo applies the diff to the cluster

## Self-healing demo

With `syncPolicy.automated.selfHeal: true`, Argo undoes out-of-band changes:

```bash
# Manually change the replica count — Argo will revert it
kubectl scale deployment backend -n task-manager --replicas=10

# Within a minute, it snaps back to what's in git
kubectl get deploy backend -n task-manager -w
```
