# CMMS Pro

Enterprise Computerized Maintenance Management System (CMMS) for manufacturing
factories — on-premise, no cloud dependency. Runs entirely inside your
company's network via Docker Compose, or directly with Node.js for development.

## Modules

Dashboard, Work Orders, Machines, Preventive Maintenance, Check Sheets, Spare
Parts, Reports, Users & Roles, Audit Log, Settings.

## Requirements

- Docker Compose path: Docker Engine 24+ and Docker Compose v2 (`docker compose`, not the old `docker-compose`)
- Manual dev path: Node.js 20+, PostgreSQL 16+

---

## Quick Start — Docker Compose (recommended for production / on-premise)

This is the standard way to run CMMS Pro on a company server. Everything
(app, database, reverse proxy) runs in containers on that one machine — no
internet access required after the images are built.

1. Copy the environment template and fill in real values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `NEXTAUTH_SECRET` to a random 32+ character string
   (`openssl rand -base64 32` works), and change `POSTGRES_PASSWORD` from the
   default. Leave `DATABASE_URL` as-is in `.env` — `docker-compose.yml`
   overrides it to point at the `postgres` container automatically.

2. Build and start everything:

   ```bash
   docker compose up -d --build
   ```

   This builds the app image, starts PostgreSQL, runs `prisma migrate deploy`
   once (the `migrate` service), then starts the app behind Nginx.

3. Seed the initial admin account (first run only):

   ```bash
   docker compose run --rm migrate npx tsx prisma/seed.ts
   ```

   Creates `admin` / `Admin@12345` — **change this password immediately**
   after your first login (Users → admin → or the in-app change-password
   flow).

4. Open `http://<server-ip>` (port 80, via Nginx) from any device on the
   same LAN/VPN/company WiFi.

To stop everything: `docker compose down` (add `-v` to also delete the
database volume — only do this if you mean to wipe all data).

### Updating to a new version

```bash
git pull
docker compose up -d --build
```

The `migrate` service re-runs `prisma migrate deploy` on every `up`, which
is safe — it only applies migrations that haven't run yet.

---

## Manual Development Setup (Windows Server, Ubuntu Server, or your own machine)

Use this path if you're actively developing, or don't want to use Docker.

1. Install Node.js 20+ and PostgreSQL 16+.
   - **Ubuntu Server**: `sudo apt-get install -y postgresql` (or use the
     PostgreSQL apt repository for a specific version), then
     `sudo service postgresql start`.
   - **Windows Server**: install Node.js from nodejs.org and PostgreSQL from
     postgresql.org (both provide native Windows installers/services).

2. Create the database and a role matching your `.env`:

   ```bash
   sudo -u postgres psql -c "CREATE USER cmms WITH PASSWORD 'cmms_password' SUPERUSER;"
   sudo -u postgres psql -c "CREATE DATABASE cmms_dev OWNER cmms;"
   ```

3. Install dependencies and configure environment:

   ```bash
   npm install
   cp .env.example .env
   ```

4. Run migrations and seed the admin account:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev      # development, with hot reload
   # or
   npm run build && npm start   # production mode, no Docker
   ```

6. Open `http://localhost:3000`.

---

## Environment Variables

See `.env.example` for the full list with defaults. The essentials:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session signing secret — must be 32+ random characters |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` | The URL users access the app at |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Optional — enables email notifications |
| `REDIS_URL` | Optional — enables Redis-backed rate limiting (falls back to in-memory) |

## Database Backup & Restore

Since everything is on-premise, backups are your responsibility. With
Docker Compose:

```bash
# Backup
docker compose exec postgres pg_dump -U cmms cmms_dev > backup-$(date +%Y%m%d).sql

# Restore (into a fresh/empty database)
cat backup-20260706.sql | docker compose exec -T postgres psql -U cmms cmms_dev
```

Without Docker, run the same `pg_dump` / `psql` commands directly against
your PostgreSQL instance.

## Health Check

`GET /api/health` reports database (and Redis, if configured) connectivity —
used by the Docker `HEALTHCHECK` and safe to point an external monitor at.
