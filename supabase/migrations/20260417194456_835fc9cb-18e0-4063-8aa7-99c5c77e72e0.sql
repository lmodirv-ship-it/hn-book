-- Auto-heal rules
CREATE TABLE public.auto_heal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text DEFAULT '',
  trigger_metric text NOT NULL, -- 'failed_jobs', 'stuck_workers', 'api_down', 'queue_depth', 'pdf_errors'
  threshold numeric NOT NULL DEFAULT 3,
  action text NOT NULL, -- maps to system-control action: retry_failed, restart_workers, reconnect_apis, clear_cache, regenerate_pdfs
  enabled boolean NOT NULL DEFAULT true,
  cooldown_seconds integer NOT NULL DEFAULT 300,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_heal_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage auto heal rules"
ON public.auto_heal_rules FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auto heal rules readable by authenticated"
ON public.auto_heal_rules FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER trg_auto_heal_rules_updated
BEFORE UPDATE ON public.auto_heal_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-heal run history
CREATE TABLE public.auto_heal_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text,
  metric text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  threshold numeric NOT NULL DEFAULT 0,
  action text,
  triggered boolean NOT NULL DEFAULT false,
  success boolean NOT NULL DEFAULT false,
  message text DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_heal_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read auto heal runs"
ON public.auto_heal_runs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role writes auto heal runs"
ON public.auto_heal_runs FOR INSERT TO service_role
WITH CHECK (true);

CREATE INDEX idx_auto_heal_runs_created ON public.auto_heal_runs (created_at DESC);

-- Seed default rules
INSERT INTO public.auto_heal_rules (key, label, description, trigger_metric, threshold, action) VALUES
  ('retry_failed_jobs', 'Retry failed jobs', 'When failed jobs exceed threshold, re-queue them', 'failed_jobs', 3, 'retry_failed'),
  ('restart_stuck_workers', 'Restart stuck workers', 'Reset jobs stuck in processing state', 'stuck_workers', 1, 'restart_workers'),
  ('reconnect_failing_apis', 'Reconnect failing APIs', 'Reconnect integrations marked as down', 'api_down', 1, 'reconnect_apis'),
  ('clear_cache_high_queue', 'Clear cache on high queue', 'Free memory when queue depth grows', 'queue_depth', 50, 'clean_temp');

-- Global toggle
INSERT INTO public.system_config (key, category, description, value)
VALUES ('auto_heal_enabled', 'system', 'Master toggle for the auto-healing engine', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;