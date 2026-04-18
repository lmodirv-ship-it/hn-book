/**
 * HN Book — VPS Mirror Receiver
 * Self-initializing, self-evolving PostgreSQL backup endpoint.
 *
 * Endpoints:
 *   POST /backup           — receive a full dump from Lovable Cloud
 *   GET  /schema           — return current tables + columns
 *   POST /migrate          — re-apply pending migrations from ./migrations
 *   GET  /sync-log         — last 50 sync runs
 *   GET  /health           — { ok: true }
 *
 * Auth: Bearer token via VPS_BACKUP_TOKEN env var.
 *
 * Safety:
 *   - Never DROPs tables or columns.
 *   - Only additive: new tables / new columns are auto-created on demand.
 *   - All migrations run inside transactions.
 */

import express from "express";
import pkg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT          = process.env.PORT || 9090;
const TOKEN         = process.env.VPS_BACKUP_TOKEN || "";
const DATABASE_URL  = process.env.DATABASE_URL ||
  `postgres://${process.env.PGUSER || "postgres"}:${process.env.PGPASSWORD || "postgres"}@${process.env.PGHOST || "127.0.0.1"}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "hnbook"}`;

if (!TOKEN) {
  console.warn("⚠️  VPS_BACKUP_TOKEN not set — endpoints are UNPROTECTED. Set it before exposing publicly!");
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });

// ────────────────────────────────────────────────────────────
// Schema helpers — the "smart" part
// ────────────────────────────────────────────────────────────

const PG_TYPE_MAP = {
  string:  "TEXT",
  number:  "NUMERIC",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  object:  "JSONB",
  array:   "JSONB",
  uuid:    "UUID",
  date:    "TIMESTAMPTZ",
};

function inferPgType(value) {
  if (value === null || value === undefined) return "TEXT";
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "number")  return Number.isInteger(value) ? "INTEGER" : "NUMERIC";
  if (typeof value === "string") {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return "UUID";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return "TIMESTAMPTZ";
    return "TEXT";
  }
  if (Array.isArray(value) || typeof value === "object") return "JSONB";
  return "TEXT";
}

function safeIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return name;
}

async function ensureTableExists(client, table, sampleRow) {
  safeIdent(table);
  const cols = Object.entries(sampleRow || { id: crypto.randomUUID() })
    .map(([k, v]) => {
      safeIdent(k);
      const type = k === "id" ? "UUID PRIMARY KEY DEFAULT gen_random_uuid()" : inferPgType(v);
      return `"${k}" ${type}`;
    })
    .join(", ");
  const sql = `CREATE TABLE IF NOT EXISTS "${table}" (${cols})`;
  await client.query(sql);
  await client.query(
    `INSERT INTO schema_events (event_type, table_name, details) VALUES ('table_created', $1, $2)`,
    [table, { columns: Object.keys(sampleRow || {}) }]
  );
}

async function ensureColumnExists(client, table, column, sampleValue) {
  safeIdent(table); safeIdent(column);
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, column]
  );
  if (rows.length > 0) return false;
  const type = inferPgType(sampleValue);
  await client.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
  await client.query(
    `INSERT INTO schema_events (event_type, table_name, column_name, details) VALUES ('column_added', $1, $2, $3)`,
    [table, column, { type }]
  );
  return true;
}

async function upsertRow(client, table, row) {
  const keys = Object.keys(row);
  if (keys.length === 0) return;
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const cols = keys.map(k => `"${safeIdent(k)}"`).join(", ");
  const updates = keys.filter(k => k !== "id").map(k => `"${k}" = EXCLUDED."${k}"`).join(", ");
  const conflict = "id" in row ? `ON CONFLICT (id) DO UPDATE SET ${updates || `"id" = EXCLUDED."id"`}` : "ON CONFLICT DO NOTHING";
  const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ${conflict}`;
  await client.query(sql, keys.map(k => {
    const v = row[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
    if (Array.isArray(v) && v.length && typeof v[0] === "object") return JSON.stringify(v);
    return v;
  }));
}

// ────────────────────────────────────────────────────────────
// Migration runner
// ────────────────────────────────────────────────────────────

async function runFile(client, filePath) {
  const sql = await fs.readFile(filePath, "utf8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex").slice(0, 16);
  const name = path.basename(filePath);
  const { rows } = await client.query(
    `SELECT 1 FROM schema_migrations WHERE name = $1`, [name]
  );
  if (rows.length > 0) return { name, applied: false, reason: "already_applied" };
  const t0 = Date.now();
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO schema_migrations (name, checksum, duration_ms) VALUES ($1, $2, $3)`,
      [name, checksum, Date.now() - t0]
    );
    await client.query(
      `INSERT INTO schema_events (event_type, details) VALUES ('migration_applied', $1)`,
      [{ name, checksum }]
    );
    await client.query("COMMIT");
    return { name, applied: true, duration_ms: Date.now() - t0 };
  } catch (e) {
    await client.query("ROLLBACK");
    throw new Error(`Migration ${name} failed: ${e.message}`);
  }
}

async function applyMigrations() {
  const client = await pool.connect();
  const results = [];
  try {
    // 1) baseline (init.sql)
    const initPath = path.join(__dirname, "init.sql");
    if (await exists(initPath)) {
      results.push(await runFile(client, initPath));
    }
    // 2) ./migrations/*.sql in alpha order
    const dir = path.join(__dirname, "migrations");
    if (await exists(dir)) {
      const files = (await fs.readdir(dir)).filter(f => f.endsWith(".sql")).sort();
      for (const f of files) {
        results.push(await runFile(client, path.join(dir, f)));
      }
    }
  } finally {
    client.release();
  }
  return results;
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

// ────────────────────────────────────────────────────────────
// HTTP server
// ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "200mb" }));

function auth(req, res, next) {
  if (!TOKEN) return next(); // dev mode
  const h = req.headers.authorization || "";
  if (h !== `Bearer ${TOKEN}`) return res.status(401).json({ error: "unauthorized" });
  next();
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, time: new Date().toISOString() });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/schema", auth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const tables = {};
    for (const r of rows) {
      (tables[r.table_name] ||= []).push({
        column: r.column_name, type: r.data_type,
        nullable: r.is_nullable === "YES", default: r.column_default,
      });
    }
    const counts = await pool.query(`
      SELECT relname AS table_name, n_live_tup AS row_count
      FROM pg_stat_user_tables ORDER BY relname
    `);
    res.json({
      tables,
      counts: counts.rows,
      table_count: Object.keys(tables).length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/migrate", auth, async (_req, res) => {
  try {
    const results = await applyMigrations();
    res.json({ ok: true, results });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/sync-log", auth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 50`
  );
  res.json({ rows });
});

app.get("/schema-events", auth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM schema_events ORDER BY created_at DESC LIMIT 100`
  );
  res.json({ rows });
});

app.post("/backup", auth, async (req, res) => {
  const t0 = Date.now();
  const payload = req.body || {};
  const data = payload.data || {};
  const tables = Object.keys(data);
  let totalRows = 0;
  const perTable = [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of tables) {
      const rows = Array.isArray(data[table]) ? data[table] : [];
      if (rows.length === 0) { perTable.push({ table, rows: 0 }); continue; }
      try { safeIdent(table); } catch { perTable.push({ table, rows: 0, skipped: "unsafe_name" }); continue; }

      // Auto-create table if missing
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [table]
      );
      if (exists.rowCount === 0) {
        await ensureTableExists(client, table, rows[0]);
      }

      // Auto-add new columns
      for (const r of rows.slice(0, 10)) {
        for (const [k, v] of Object.entries(r)) {
          try { await ensureColumnExists(client, table, k, v); } catch { /* skip unsafe */ }
        }
      }

      // Upsert
      let inserted = 0;
      for (const r of rows) {
        try { await upsertRow(client, table, r); inserted++; } catch (_) { /* row failed */ }
      }
      totalRows += inserted;
      perTable.push({ table, rows: inserted });
    }
    await client.query(
      `INSERT INTO sync_log (source, table_count, row_count, duration_ms, status)
       VALUES ($1, $2, $3, $4, 'success')`,
      [payload.source || "lovable-cloud", tables.length, totalRows, Date.now() - t0]
    );
    await client.query("COMMIT");
    res.json({ ok: true, table_count: tables.length, row_count: totalRows, duration_ms: Date.now() - t0, per_table: perTable });
  } catch (e) {
    await client.query("ROLLBACK");
    await pool.query(
      `INSERT INTO sync_log (source, table_count, row_count, duration_ms, status, error)
       VALUES ($1, $2, $3, $4, 'error', $5)`,
      [payload.source || "lovable-cloud", tables.length, totalRows, Date.now() - t0, e.message]
    ).catch(() => {});
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    client.release();
  }
});

// ────────────────────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────────────────────

(async () => {
  console.log("⏳ Applying migrations…");
  try {
    const results = await applyMigrations();
    const applied = results.filter(r => r.applied);
    console.log(`✓ Migrations OK — ${applied.length} new, ${results.length - applied.length} already applied`);
  } catch (e) {
    console.error("✗ Migration failure:", e.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`🚀 HN Book VPS Mirror running on :${PORT}`);
    console.log(`   POST /backup • GET /schema • POST /migrate • GET /sync-log`);
  });
})();
