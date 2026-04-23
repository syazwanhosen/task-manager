# Task Manager — Docker Full-Stack Demo

A tiny but complete full-stack app you can run locally with a single command.

- **Frontend** — React (via CDN, no build step) served by Nginx
- **Backend** — Node.js + Express REST API
- **Database** — PostgreSQL 16

All three run as separate containers, orchestrated with Docker Compose.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose plugin)
- Ports **8080** and **5433** free on your host

## Quick start

From the project root:

```bash
docker compose up --build
```

Then open **http://localhost:8080** in your browser.

To stop:

```bash
# Stop containers (keep the database volume)
docker compose down

# Stop AND wipe the database volume
docker compose down -v
```

---

## Architecture

```
 Browser
    |
    |  http://localhost:8080
    v
 +-----------+       +-----------+       +-----------+
 | frontend  | --->  | backend   | --->  |    db     |
 |  (nginx)  | /api/ | (express) |  SQL  | (postgres)|
 +-----------+       +-----------+       +-----------+
     :80               :3000                 :5432
```

- The **frontend** is the only service published to your host (port 8080).
- Nginx serves the static React files, and proxies any `/api/` request through to the backend.
- The **backend** talks to the **db** over Docker's internal network using the hostname `db`.
- Postgres is also published on **host port 5433** if you want to connect with a SQL client (user `app`, password `secret`, db `tasks`).

---

## Project layout

```
task-manager/
├── docker-compose.yml       # Run locally with Docker Compose
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── src/
│       └── server.js        # Express API (CRUD for tasks)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── index.html
│       ├── app.jsx          # React component
│       └── styles.css
└── k8s/                     # Same app, running on Kubernetes
    ├── 00-namespace.yaml
    ├── 01-db-config.yaml
    ├── 02-db.yaml
    ├── 03-backend.yaml
    ├── 04-frontend.yaml
    ├── 05-ingress.yaml
    ├── 06-hpa.yaml
    └── README.md
```

## Want to run it on Kubernetes?

See [`k8s/README.md`](./k8s/README.md) for manifests and step-by-step instructions for minikube, kind, or Docker Desktop.

---

## REST API

The backend exposes these endpoints (via the nginx proxy at `/api/...`):

| Method | Path              | Description                     |
|--------|-------------------|---------------------------------|
| GET    | `/api/health`     | Health check                    |
| GET    | `/api/tasks`      | List all tasks                  |
| POST   | `/api/tasks`      | Create a task `{ "title": "" }` |
| PATCH  | `/api/tasks/:id`  | Toggle `{ "done": true/false }` |
| DELETE | `/api/tasks/:id`  | Delete a task                   |

Try it from the terminal:

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/tasks
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Docker"}'
```

---

## Useful Docker commands

```bash
# See running containers
docker compose ps

# Tail logs from all services
docker compose logs -f

# Tail logs from just the backend
docker compose logs -f backend

# Shell into a running container
docker compose exec backend sh
docker compose exec db psql -U app -d tasks

# Rebuild after changing a Dockerfile
docker compose up --build
```

---

## What this demonstrates

- Multi-service orchestration with Docker Compose
- Service-to-service networking using container names as hostnames
- A Postgres **healthcheck** + `depends_on: service_healthy` so the backend only starts once the database is actually ready
- **Named volumes** for persistent database storage across restarts
- **Nginx as a reverse proxy** for the API, avoiding CORS issues entirely
- A non-root user inside the backend image
- Port remapping (`5433:5432`) to avoid host conflicts
