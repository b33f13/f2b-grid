# F2B-GRID Docker Setup

This guide provides instructions on how to build, run, and manage the F2B-GRID dashboard using Docker and Docker Compose. 

Dockerization ensures that the application is fully containerized, portable, and reproducible, avoiding local dependency issues.

## Prerequisites
- **Docker** installed (`docker --version`)
- **Docker Compose** installed (`docker compose version`)

## Quickstart

1. **Configure Environment Variables**
   Make sure to create an `.env` file in the root directory with the following content:
   ```env
   F2B_DB_PATH=/var/lib/fail2ban/fail2ban.sqlite3
   # For local dev without docker, you might use:
   # F2B_DB_PATH=./data/fail2ban.sqlite3
   ```
   *Note: If testing with the mock generator, ensure `F2B_DB_PATH` inside your `.env` is set correctly. The `docker-compose.yml` mounts `./data:/app/data` to the backend, so it will read the local `data/` folder.*

2. **Build the Images**
   This compiles the React frontend into static assets via Vite and sets up the FastAPI python backend.
   ```bash
   docker compose build
   ```

3. **Start the Application**
   Run the containers in detached mode:
   ```bash
   docker compose up -d
   ```

4. **Access the Dashboard**
   Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

## Useful Commands

| Command | Action |
| --- | --- |
| `docker compose up -d` | Starts the containers detached |
| `docker compose down` | Stops and removes the containers |
| `docker compose logs -f` | Tails the live logs of both containers |
| `docker compose ps` | Shows the running status of containers |

## Architecture Overview

- **Backend Container (`f2b-grid-backend`)**:
  - Image: `python:3.11-slim`
  - Installs system dependencies `whois` and `traceroute` for investigation tools.
  - Exposes port `8080` internally.
  - Mounts `./data` to read the fail2ban sqlite database.

- **Frontend Container (`f2b-grid-frontend`)**:
  - Multi-stage build: `node:22-alpine` (building) → `nginx:alpine` (serving).
  - Uses a custom `nginx.conf` that acts as a reverse proxy, routing `/api/` traffic directly to the backend container.
  - Exposed publicly on port `3000`.
