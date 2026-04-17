-- Extend api_integrations to be a production-ready integration registry.
-- Sensitive credentials are NOT stored in the DB. Instead, secret_ref holds the
-- name of a secret stored in the platform secret manager (Deno.env in edge functions),
-- and only a masked preview hint is kept for the admin UI.

ALTER TABLE public.api_integrations
  ADD COLUMN IF NOT EXISTS secret_ref text,
  ADD COLUMN IF NOT EXISTS key_hint text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS api_integrations_name_unique_idx
  ON public.api_integrations (lower(name));

-- updated_at trigger
DROP TRIGGER IF EXISTS api_integrations_set_updated_at ON public.api_integrations;
CREATE TRIGGER api_integrations_set_updated_at
BEFORE UPDATE ON public.api_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();