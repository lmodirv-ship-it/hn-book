
-- Create visitors table
CREATE TABLE public.visitors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text,
  user_agent text,
  page_path text DEFAULT '/',
  user_id uuid,
  visit_time timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visits (anonymous tracking)
CREATE POLICY "Anyone can insert visits"
  ON public.visitors FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can view visits
CREATE POLICY "Admins can view visits"
  ON public.visitors FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete visits
CREATE POLICY "Admins can delete visits"
  ON public.visitors FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster daily queries
CREATE INDEX idx_visitors_visit_time ON public.visitors (visit_time DESC);
