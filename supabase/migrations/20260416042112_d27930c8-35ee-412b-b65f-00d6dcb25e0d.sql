
CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL DEFAULT 'system_repair',
  triggered_by text NOT NULL DEFAULT 'manual',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  fixes_count integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  total_issues integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system logs"
ON public.system_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert logs"
ON public.system_logs
FOR INSERT
TO service_role
WITH CHECK (true);
