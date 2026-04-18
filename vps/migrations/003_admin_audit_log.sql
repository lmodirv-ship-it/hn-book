-- Admin audit log: every write action from the admin panel goes here.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor       TEXT NOT NULL DEFAULT 'unknown',
  action      TEXT NOT NULL,
  target      TEXT NOT NULL DEFAULT '',
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  success     BOOLEAN NOT NULL DEFAULT TRUE,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action  ON admin_audit_log (action);
