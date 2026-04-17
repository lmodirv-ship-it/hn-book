CREATE TABLE IF NOT EXISTS public.digital_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  asset_type text NOT NULL DEFAULT 'other',
  category text NOT NULL DEFAULT 'general',
  image_url text NOT NULL,
  file_url text,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Digital assets are publicly readable"
  ON public.digital_assets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage digital assets"
  ON public.digital_assets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_digital_assets_updated_at
  BEFORE UPDATE ON public.digital_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_digital_assets_type ON public.digital_assets(asset_type);
CREATE INDEX idx_digital_assets_active ON public.digital_assets(is_active);