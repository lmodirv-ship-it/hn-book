
CREATE TABLE public.upload_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  result jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.upload_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage upload jobs"
  ON public.upload_jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_upload_jobs_updated_at
  BEFORE UPDATE ON public.upload_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
