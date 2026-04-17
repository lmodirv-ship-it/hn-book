
-- 1) Allow 'dead' status on jobs
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending','processing','completed','failed','cancelled','dead'));

-- Update validate_job_status function to include 'dead'
CREATE OR REPLACE FUNCTION public.validate_job_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('pending','processing','completed','failed','cancelled','dead') THEN
    RAISE EXCEPTION 'Invalid job status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Track when an admin was last notified about a dead job, to avoid duplicate notifications
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

-- 2) Per-type retry policies
CREATE TABLE IF NOT EXISTS public.job_retry_policies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type     text UNIQUE NOT NULL,
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 20),
  backoff_seconds integer NOT NULL DEFAULT 30 CHECK (backoff_seconds >= 0),
  enabled      boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_retry_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Retry policies readable by authenticated"
ON public.job_retry_policies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage retry policies"
ON public.job_retry_policies FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_job_retry_policies_updated
BEFORE UPDATE ON public.job_retry_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.job_retry_policies (job_type, max_attempts, backoff_seconds) VALUES
  ('generate_pdf', 3, 30),
  ('convert_eps_to_svg', 3, 30),
  ('import_designs', 2, 30),
  ('send_whatsapp', 5, 15),
  ('pdf_generation', 3, 30),
  ('eps_to_svg', 3, 30),
  ('import', 2, 30)
ON CONFLICT (job_type) DO NOTHING;

-- 3) Per-attempt history
CREATE TABLE IF NOT EXISTS public.job_attempts (
  id           bigserial PRIMARY KEY,
  job_id       uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  attempt      integer NOT NULL,
  status       text NOT NULL CHECK (status IN ('started','succeeded','failed','dead')),
  error        text,
  duration_ms  integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_attempts_job_id_idx
  ON public.job_attempts (job_id, created_at DESC);

ALTER TABLE public.job_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all job attempts"
ON public.job_attempts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read attempts for their own jobs"
ON public.job_attempts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs j
  WHERE j.id = job_attempts.job_id AND j.created_by = auth.uid()
));

CREATE POLICY "Service role writes job attempts"
ON public.job_attempts FOR INSERT TO service_role WITH CHECK (true);
