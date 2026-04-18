/**
 * HN Book — VPS Mirror Receiver + Smart Database Admin
 *
 * Endpoints:
 *   GET  /health            — { ok: true }
 *   GET  /schema            — tables + columns + counts
 *   GET  /overview          — db size, table count, total rows, status
 *   GET  /sync-log          — last 50 backup runs
 *   GET  /schema-events     — recent automatic schema changes
 *   GET  /audit-log         — admin actions audit trail
 *   POST /migrate           — re-apply pending migrations
 *   POST /backup            — receive a JSON dump from Lovable Cloud
 *   POST /table-data        — { table, search?, page?, page_size?, order_by? }
 *   POST /row-insert        — { table, row, _actor }
 *   POST /row-update        — { table, id, row, _actor }
 *   POST /row-delete        — { table, id, _actor }
 *   POST /query             — { sql, allow_write?: false, _actor }
 *   POST /add-column        — { table, column, type, _actor }  (uses ADD COLUMN IF NOT EXISTS)
 *
 * Auth: Bearer token via VPS_BACKUP_TOKEN env var.
 *
 * Safety:
 *   - DROP TABLE / TRUNCATE / DROP DATABASE always blocked.
 *   - Write SQL only with allow_write=true (still blocks the dangerous keywords above).
 *   - Migrations are additive; never DROP columns.
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
  console.warn("⚠️  VPS_BACKUP_TOKEN not set — endpoints are UNPROTECTED.");
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const PG_TYPES = new Set([
  "TEXT","VARCHAR","CHAR","INTEGER","BIGINT","SMALLINT","NUMERIC","REAL","DOUBLE PRECISION",
  "BOOLEAN","UUID","JSONB","JSON","DATE","TIMESTAMP","TIMESTAMPTZ","TIME","BYTEA",
]);

const DANGEROUS = /\b(drop\s+table|drop\s+database|drop\s+schema|truncate|alter\s+table\s+\S+\s+drop)\b/i;

function safeIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return name;
}

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

async function ensureTableExists(client, table, sampleRow) {
  safeIdent(table);
  const cols = Object.entries(sampleRow || { id: crypto.randomUUID() })
    .map(([k, v]) => {
      safeIdent(k);
      const type = k === "id" ? "UUID PRIMARY KEY DEFAULT gen_random_uuid()" : inferPgType(v);
      return `"${k}" ${type}`;
    }).join(", ");
  await client.query(`CREATE TABLE IF NOT EXISTS "${table}" (${cols})`);
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
  await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
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
  await client.query(
    `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ${conflict}`,
    keys.map(k => normalizeValue(row[k]))
  );
}

function normalizeValue(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
  if (Array.isArray(v) && v.length && typeof v[0] === "object") return JSON.stringify(v);
  return v;
}

async function audit(actor, action, target, details, ok = true, err = null) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (actor, action, target, details, success, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actor || "unknown", action, target || "", details || {}, ok, err]
    );
  } catch (_) { /* audit failures must never break a request */ }
}

// ────────────────────────────────────────────────────────────
// Migrations
// ────────────────────────────────────────────────────────────

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function runFile(client, filePath) {
  const sql = await fs.readFile(filePath, "utf8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex").slice(0, 16);
  const name = path.basename(filePath);
  const { rows } = await client.query(`SELECT 1 FROM schema_migrations WHERE name = $1`, [name]);
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
    const initPath = path.join(__dirname, "init.sql");
    if (await exists(initPath)) results.push(await runFile(client, initPath));
    const dir = path.join(__dirname, "migrations");
    if (await exists(dir)) {
      const files = (await fs.readdir(dir)).filter(f => f.endsWith(".sql")).sort();
      for (const f of files) results.push(await runFile(client, path.join(dir, f)));
    }
  } finally { client.release(); }
  return results;
}

// ────────────────────────────────────────────────────────────
// HTTP server
// ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "200mb" }));

function auth(req, res, next) {
  if (!TOKEN) return next();
  const h = req.headers.authorization || "";
  if (h !== `Bearer ${TOKEN}`) return res.status(401).json({ error: "unauthorized" });
  next();
}

app.get("/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true, time: new Date().toISOString() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
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
    res.json({ tables, counts: counts.rows, table_count: Object.keys(tables).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/overview", auth, async (_req, res) => {
  try {
    const sizeQ = await pool.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size, pg_database_size(current_database()) AS bytes`);
    const tablesQ = await pool.query(`
      SELECT relname AS table_name,
             n_live_tup AS row_count,
             pg_size_pretty(pg_total_relation_size(C.oid)) AS size,
             pg_total_relation_size(C.oid) AS size_bytes
      FROM pg_class C
      LEFT JOIN pg_namespace N ON N.oid = C.relnamespace
      LEFT JOIN pg_stat_user_tables S ON S.relname = C.relname
      WHERE N.nspname = 'public' AND C.relkind = 'r'
      ORDER BY pg_total_relation_size(C.oid) DESC
    `);
    const total = tablesQ.rows.reduce((s, r) => s + (Number(r.row_count) || 0), 0);
    res.json({
      ok: true,
      db_size: sizeQ.rows[0]?.size,
      db_bytes: Number(sizeQ.rows[0]?.bytes || 0),
      table_count: tablesQ.rowCount,
      total_rows: total,
      tables: tablesQ.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/migrate", auth, async (req, res) => {
  try {
    const results = await applyMigrations();
    await audit(req.body?._actor, "migrate", "all", { count: results.length });
    res.json({ ok: true, results });
  } catch (e) {
    await audit(req.body?._actor, "migrate", "all", { error: e.message }, false, e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/sync-log", auth, async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 50`);
  res.json({ rows });
});

app.get("/schema-events", auth, async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM schema_events ORDER BY created_at DESC LIMIT 100`);
  res.json({ rows });
});

app.get("/audit-log", auth, async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 200`);
  res.json({ rows });
});

// ───────── Data viewer ─────────

app.post("/table-data", auth, async (req, res) => {
  try {
    const { table, search = "", page = 1, page_size = 50, order_by = "" } = req.body || {};
    safeIdent(table);
    const limit = Math.min(Math.max(Number(page_size) || 50, 1), 500);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    // Build search clause across all text-y columns
    const colsQ = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [table]
    );
    const columns = colsQ.rows;
    const params = [];
    let where = "";
    if (search && search.trim()) {
      const searchable = columns
        .filter(c => ["text","varchar","character varying","uuid"].includes(c.data_type))
        .map(c => `"${c.column_name}"::text ILIKE $${params.push(`%${search}%`)}`);
      if (searchable.length) where = `WHERE ${searchable.join(" OR ")}`;
    }

    let orderClause = "";
    if (order_by) {
      const m = order_by.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\s+(asc|desc))?$/i);
      if (m) orderClause = `ORDER BY "${m[1]}" ${(m[3] || "asc").toUpperCase()}`;
    }

    const totalQ = await pool.query(`SELECT COUNT(*)::int AS c FROM "${table}" ${where}`, params);
    const dataQ = await pool.query(
      `SELECT * FROM "${table}" ${where} ${orderClause} LIMIT ${limit} OFFSET ${offset}`, params
    );
    res.json({ ok: true, columns, rows: dataQ.rows, total: totalQ.rows[0].c, page, page_size: limit });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

app.post("/row-insert", auth, async (req, res) => {
  try {
    const { table, row = {}, _actor } = req.body || {};
    safeIdent(table);
    const keys = Object.keys(row).filter(k => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
    if (!keys.length) throw new Error("No valid columns");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const cols = keys.map(k => `"${k}"`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`,
      keys.map(k => normalizeValue(row[k]))
    );
    await audit(_actor, "row_insert", table, { id: rows[0]?.id });
    res.json({ ok: true, row: rows[0] });
  } catch (e) {
    await audit(req.body?._actor, "row_insert", req.body?.table, { error: e.message }, false, e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.post("/row-update", auth, async (req, res) => {
  try {
    const { table, id, row = {}, _actor } = req.body || {};
    safeIdent(table);
    if (!id) throw new Error("id is required");
    const keys = Object.keys(row).filter(k => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) && k !== "id");
    if (!keys.length) throw new Error("Nothing to update");
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const params = keys.map(k => normalizeValue(row[k]));
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE "${table}" SET ${sets} WHERE id = $${params.length} RETURNING *`, params
    );
    await audit(_actor, "row_update", table, { id, fields: keys });
    res.json({ ok: true, row: rows[0] });
  } catch (e) {
    await audit(req.body?._actor, "row_update", req.body?.table, { error: e.message }, false, e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.post("/row-delete", auth, async (req, res) => {
  try {
    const { table, id, _actor } = req.body || {};
    safeIdent(table);
    if (!id) throw new Error("id is required");
    await pool.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    await audit(_actor, "row_delete", table, { id });
    res.json({ ok: true });
  } catch (e) {
    await audit(req.body?._actor, "row_delete", req.body?.table, { error: e.message }, false, e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ───────── Query runner ─────────

app.post("/query", auth, async (req, res) => {
  const t0 = Date.now();
  const { sql = "", allow_write = false, _actor } = req.body || {};
  const trimmed = String(sql).trim();
  try {
    if (!trimmed) throw new Error("Empty query");
    if (DANGEROUS.test(trimmed)) throw new Error("Dangerous statement blocked (DROP/TRUNCATE)");
    const isSelect = /^select\s/i.test(trimmed) || /^with\s/i.test(trimmed) || /^explain\s/i.test(trimmed);
    if (!isSelect && !allow_write) throw new Error("Write mode is OFF — enable to run INSERT/UPDATE/DELETE");
    const result = await pool.query(trimmed);
    await audit(_actor, "query", isSelect ? "read" : "write", { sql: trimmed.slice(0, 500), rows: result.rowCount });
    res.json({
      ok: true, rows: result.rows ?? [], rowCount: result.rowCount,
      fields: (result.fields || []).map(f => f.name),
      duration_ms: Date.now() - t0,
    });
  } catch (e) {
    await audit(_actor, "query", "error", { sql: trimmed.slice(0, 500), error: e.message }, false, e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ───────── Schema editor ─────────

app.post("/add-column", auth, async (req, res) => {
  try {
    const { table, column, type, _actor } = req.body || {};
    safeIdent(table); safeIdent(column);
    const upper = String(type || "TEXT").toUpperCase();
    if (!PG_TYPES.has(upper)) throw new Error(`Unsupported type: ${type}`);
    await pool.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${upper}`);
    await pool.query(
      `INSERT INTO schema_events (event_type, table_name, column_name, details) VALUES ('column_added', $1, $2, $3)`,
      [table, column, { type: upper, source: "admin_ui" }]
    );
    await audit(_actor, "add_column", table, { column, type: upper });
    res.json({ ok: true });
  } catch (e) {
    await audit(req.body?._actor, "add_column", req.body?.table, { error: e.message }, false, e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ───────── Backup receiver (unchanged behavior, additive) ─────────

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
      const ex = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [table]
      );
      if (ex.rowCount === 0) await ensureTableExists(client, table, rows[0]);
      for (const r of rows.slice(0, 10)) {
        for (const [k, v] of Object.entries(r)) {
          try { await ensureColumnExists(client, table, k, v); } catch { /* skip */ }
        }
      }
      let inserted = 0;
      for (const r of rows) { try { await upsertRow(client, table, r); inserted++; } catch (_) {} }
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
  } finally { client.release(); }
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
  });
})();
