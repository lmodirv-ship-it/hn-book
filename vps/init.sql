-- ============================================================
-- HN Book — VPS Mirror Database Initialization
-- This file is applied automatically on first startup.
-- Safe to re-run: every CREATE uses IF NOT EXISTS.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Migration tracking ------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  id            SERIAL PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum      TEXT,
  duration_ms   INTEGER
);

-- Sync log (every push from Lovable Cloud) --------------------
CREATE TABLE IF NOT EXISTS sync_log (
  id            SERIAL PRIMARY KEY,
  source        TEXT NOT NULL DEFAULT 'lovable-cloud',
  table_count   INTEGER NOT NULL DEFAULT 0,
  row_count     INTEGER NOT NULL DEFAULT 0,
  duration_ms   INTEGER,
  status        TEXT NOT NULL DEFAULT 'success',
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Schema events (auto-evolution audit trail) ------------------
CREATE TABLE IF NOT EXISTS schema_events (
  id          SERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,        -- 'table_created' | 'column_added' | 'migration_applied'
  table_name  TEXT,
  column_name TEXT,
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Core domain tables (mirror of Lovable Cloud public schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE,
  display_name TEXT,
  phone        TEXT,
  avatar_url   TEXT,
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id   UUID,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT,
  category        TEXT NOT NULL DEFAULT 'General',
  category_id     UUID,
  description     TEXT,
  short_description TEXT,
  price           NUMERIC NOT NULL DEFAULT 0,
  original_price  NUMERIC,
  image           TEXT NOT NULL DEFAULT '/placeholder.svg',
  pdf_url         TEXT NOT NULL DEFAULT '',
  page_count      INTEGER,
  reference_code  TEXT,
  badge           TEXT,
  features        TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  is_flash_deal   BOOLEAN DEFAULT false,
  deal_ends_in    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT,
  asset_type  TEXT NOT NULL,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT NOT NULL DEFAULT '/placeholder.svg',
  file_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_kind      TEXT NOT NULL DEFAULT 'other',
  file_name      TEXT NOT NULL,
  file_extension TEXT,
  storage_path   TEXT NOT NULL,
  public_url     TEXT NOT NULL,
  file_size      BIGINT,
  mime_type      TEXT,
  folder_path    TEXT DEFAULT '',
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes ---------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_asset_files_asset_id ON asset_files(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(code);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at DESC);

-- Mark this migration as applied ------------------------------
INSERT INTO schema_migrations (name, checksum)
VALUES ('000_init', 'baseline')
ON CONFLICT (name) DO NOTHING;
