CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.api_integrations(id) ON DELETE SET NULL,
  provider text NOT NULL,
  action text NOT NULL DEFAULT 'test',
  success boolean NOT NULL DEFAULT false,
  status_code integer,
  duration_ms integer,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_logs_provider_created_idx
  ON public.integration_logs (provider, created_at DESC);

CREATE INDEX IF NOT EXISTS integration_logs_integration_idx
  ON public.integration_logs (integration_id, created_at DESC);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view integration logs"
  ON public.integration_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete integration logs"
  ON public.integration_logs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));