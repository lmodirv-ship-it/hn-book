# HN Book — VPS Mirror

Self-initializing, self-evolving PostgreSQL mirror that receives backups from Lovable Cloud
and **auto-creates tables / columns** as your schema grows.

## Features

- 🚀 **Auto-init**: `init.sql` runs once on first boot
- 🧬 **Auto-evolve**: new tables / new columns are created on the fly when a backup arrives
- 📜 **Migrations folder**: drop `.sql` files into `./migrations/` — applied in alpha order
- 🔒 **Bearer token auth** + safe-identifier checks (no DROP, no destructive SQL)
- 📊 **Schema + sync-log endpoints** for the admin dashboard

## Quick start (Docker — recommended)

```bash
cd vps
cp .env.example .env  # set POSTGRES_PASSWORD and VPS_BACKUP_TOKEN
docker compose up -d
```

Then in Lovable Cloud admin → Settings, set:
- `VPS_BACKUP_URL` = `https://your-vps-domain.com/backup`
- `VPS_BACKUP_TOKEN` = same value as above

## Quick start (bare metal)

```bash
sudo apt install -y nodejs npm postgresql
sudo -u postgres createdb hnbook
cd vps && npm install
DATABASE_URL=postgres://postgres@127.0.0.1/hnbook \
VPS_BACKUP_TOKEN=your-secret \
node server.js
```

Use `pm2 start server.js --name hnbook-mirror` for production.

## Endpoints

| Method | Path             | Purpose                                      |
|--------|------------------|----------------------------------------------|
| GET    | `/health`        | Liveness probe (no auth)                     |
| POST   | `/backup`        | Receive full dump from Lovable Cloud         |
| GET    | `/schema`        | List tables, columns, row counts             |
| POST   | `/migrate`       | Re-apply pending migrations                  |
| GET    | `/sync-log`      | Last 50 sync runs                            |
| GET    | `/schema-events` | Audit trail (table_created, column_added…)   |

All endpoints except `/health` require `Authorization: Bearer <VPS_BACKUP_TOKEN>`.

## Adding a migration

1. Create `migrations/003_my_change.sql`
2. Use **only additive** statements: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
3. Restart the service **or** call `POST /migrate`
4. The file name is recorded in `schema_migrations` — never re-run

## Safety guarantees

- ❌ The receiver **never** issues `DROP TABLE` or `DROP COLUMN`
- ❌ Identifier whitelist regex blocks SQL injection via table/column names
- ✅ Every backup runs in a single transaction (all-or-nothing)
- ✅ Every schema change is logged to `schema_events`
