
-- Pricing rules table
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'MA',
  paper_type text NOT NULL DEFAULT 'standard',
  min_pages integer NOT NULL DEFAULT 0,
  max_pages integer NOT NULL DEFAULT 999999,
  price_per_page numeric NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing rules are publicly readable"
  ON public.pricing_rules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage pricing rules"
  ON public.pricing_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Global pricing settings (key-value)
CREATE TABLE public.pricing_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing settings are publicly readable"
  ON public.pricing_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage pricing settings"
  ON public.pricing_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default base price
INSERT INTO public.pricing_settings (key, value)
VALUES ('base_price_per_page', '{"value": 1, "currency": "MAD"}');

-- Insert default rules for Morocco
INSERT INTO public.pricing_rules (label, country, paper_type, min_pages, max_pages, price_per_page, priority)
VALUES
  ('كتب صغيرة - عادي', 'MA', 'standard', 1, 100, 1.0, 10),
  ('كتب متوسطة - عادي', 'MA', 'standard', 101, 300, 0.8, 20),
  ('كتب كبيرة - عادي', 'MA', 'standard', 301, 999999, 0.6, 30),
  ('كتب صغيرة - فاخر', 'MA', 'premium', 1, 100, 2.0, 10),
  ('كتب متوسطة - فاخر', 'MA', 'premium', 101, 300, 1.5, 20),
  ('كتب كبيرة - فاخر', 'MA', 'premium', 301, 999999, 1.2, 30);
