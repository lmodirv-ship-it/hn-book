ALTER TABLE public.print_pricing_rules
  ADD COLUMN discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  ADD COLUMN promo_label TEXT,
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN valid_from TIMESTAMPTZ,
  ADD COLUMN valid_until TIMESTAMPTZ;

CREATE INDEX print_pricing_rules_featured_idx
  ON public.print_pricing_rules (asset_type, is_featured)
  WHERE is_active = true;