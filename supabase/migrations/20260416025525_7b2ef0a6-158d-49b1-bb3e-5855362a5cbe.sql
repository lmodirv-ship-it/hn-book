
-- Add slug column (no unique constraint yet)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

-- Populate slugs for existing products using row_number to handle duplicates
WITH slugged AS (
  SELECT id,
    lower(
      CASE
        WHEN name ~ '^(HN[A-Z]?-[0-9]+)' THEN substring(name from '^(HN[A-Z]?-[0-9]+)')
        ELSE left(trim(both '-' from regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')), 80)
      END
    ) as base_slug,
    row_number() OVER (
      PARTITION BY lower(
        CASE
          WHEN name ~ '^(HN[A-Z]?-[0-9]+)' THEN substring(name from '^(HN[A-Z]?-[0-9]+)')
          ELSE left(trim(both '-' from regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')), 80)
        END
      )
      ORDER BY created_at
    ) as rn
  FROM public.products
)
UPDATE public.products p
SET slug = CASE WHEN s.rn = 1 THEN s.base_slug ELSE s.base_slug || '-' || s.rn END
FROM slugged s
WHERE p.id = s.id;

-- Now add unique constraint and index
ALTER TABLE public.products ADD CONSTRAINT products_slug_key UNIQUE (slug);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_product_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.name ~ '^(HN[A-Z]?-[0-9]+)' THEN
      base_slug := lower(substring(NEW.name from '^(HN[A-Z]?-[0-9]+)'));
    ELSE
      base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
      base_slug := trim(both '-' from base_slug);
      base_slug := left(base_slug, 80);
    END IF;

    final_slug := base_slug;
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug AND id != NEW.id);
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for auto slug on insert
CREATE TRIGGER generate_product_slug_trigger
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.generate_product_slug();
