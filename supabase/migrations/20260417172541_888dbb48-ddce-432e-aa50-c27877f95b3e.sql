-- Asset counters table (per type per year)
CREATE TABLE IF NOT EXISTS public.asset_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type text NOT NULL,
  year integer NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_type, year)
);

ALTER TABLE public.asset_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Counters readable by admins"
  ON public.asset_counters FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Main assets table
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  asset_type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  image_url text NOT NULL DEFAULT '/placeholder.svg',
  file_url text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_category_check CHECK (category IN ('DSN','MED','DOC','OTH')),
  CONSTRAINT assets_type_check CHECK (asset_type IN ('CRD','TPL','LOG','FLY','PST','IMG','ART','DOC','PRE','LST','OTH'))
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets are publicly readable"
  ON public.assets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage assets"
  ON public.assets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_code ON public.assets(code);
CREATE INDEX IF NOT EXISTS idx_assets_active ON public.assets(is_active);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets(created_at DESC);

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Map type -> category
CREATE OR REPLACE FUNCTION public.asset_category_for_type(_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _type
    WHEN 'CRD' THEN 'DSN'
    WHEN 'TPL' THEN 'DSN'
    WHEN 'LOG' THEN 'DSN'
    WHEN 'FLY' THEN 'DSN'
    WHEN 'PST' THEN 'DSN'
    WHEN 'IMG' THEN 'MED'
    WHEN 'ART' THEN 'MED'
    WHEN 'DOC' THEN 'DOC'
    WHEN 'PRE' THEN 'DOC'
    WHEN 'LST' THEN 'DOC'
    ELSE 'OTH'
  END
$$;

-- Generate asset code: HN-{CAT}-{TYPE}-{YEAR}-{SEQ}
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::int;
  v_cat text;
  v_seq integer;
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code <> '' THEN
    RETURN NEW;
  END IF;

  v_cat := public.asset_category_for_type(NEW.asset_type);
  NEW.category := v_cat;

  INSERT INTO public.asset_counters (asset_type, year, current_value)
  VALUES (NEW.asset_type, v_year, 1)
  ON CONFLICT (asset_type, year)
  DO UPDATE SET current_value = asset_counters.current_value + 1, updated_at = now()
  RETURNING current_value INTO v_seq;

  NEW.code := 'HN-' || v_cat || '-' || NEW.asset_type || '-' || v_year::text || '-' || lpad(v_seq::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_generate_code
  BEFORE INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.generate_asset_code();