CREATE TABLE public.print_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  shipping_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_price >= 0),
  paper_size TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX print_pricing_rules_unique_combo
  ON public.print_pricing_rules (asset_type, quantity, COALESCE(paper_size, ''));

ALTER TABLE public.print_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pricing rules"
  ON public.print_pricing_rules FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pricing rules"
  ON public.print_pricing_rules FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing rules"
  ON public.print_pricing_rules FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing rules"
  ON public.print_pricing_rules FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_print_pricing_rules_updated_at
  BEFORE UPDATE ON public.print_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();