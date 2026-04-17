
-- Jobs queue table
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validate status via trigger (immutable-safe)
CREATE OR REPLACE FUNCTION public.validate_job_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','processing','completed','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid job status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jobs_validate
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.validate_job_status();

-- Indexes
CREATE INDEX idx_jobs_pickup ON public.jobs (status, scheduled_at, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_jobs_status ON public.jobs (status);
CREATE INDEX idx_jobs_type ON public.jobs (type);
CREATE INDEX idx_jobs_created_by ON public.jobs (created_by);

-- RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all jobs"
ON public.jobs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own jobs"
ON public.jobs FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users create their own jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Service role full access"
ON public.jobs FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
