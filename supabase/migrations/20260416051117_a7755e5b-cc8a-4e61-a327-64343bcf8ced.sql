
CREATE TABLE public.logos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logos are publicly readable"
  ON public.logos FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage logos"
  ON public.logos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add logo_id to print_orders
ALTER TABLE public.print_orders ADD COLUMN IF NOT EXISTS logo_id uuid REFERENCES public.logos(id);
