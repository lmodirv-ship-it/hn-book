-- System alerts: real-time errors/warnings shown on the control center
CREATE TABLE public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',  -- info | warning | error
  source text NOT NULL DEFAULT 'system',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage alerts"
  ON public.system_alerts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role inserts alerts"
  ON public.system_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX idx_system_alerts_created ON public.system_alerts (created_at DESC);
CREATE INDEX idx_system_alerts_unack ON public.system_alerts (acknowledged, created_at DESC);

-- Rolling performance metrics samples
CREATE TABLE public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,           -- response_time_ms | db_latency_ms | jobs_pending | jobs_failed | etc
  metric_value numeric NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read metrics"
  ON public.system_metrics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role writes metrics"
  ON public.system_metrics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX idx_system_metrics_key_time ON public.system_metrics (metric_key, created_at DESC);

-- Realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;