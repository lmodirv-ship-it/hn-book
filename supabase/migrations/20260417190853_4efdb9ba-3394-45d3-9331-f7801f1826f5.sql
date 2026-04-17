ALTER TABLE public.api_integrations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_message text;

ALTER TABLE public.api_integrations
  DROP CONSTRAINT IF EXISTS api_integrations_status_check;

ALTER TABLE public.api_integrations
  ADD CONSTRAINT api_integrations_status_check
  CHECK (status IN ('not_configured','connected','error'));