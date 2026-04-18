-- Add slug column to svg_templates with unique constraint and auto-generation
ALTER TABLE public.svg_templates
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS svg_templates_slug_key
  ON public.svg_templates (slug)
  WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_svg_template_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  -- Lowercase, replace non-alphanumeric (keep arabic) with dashes
  base_slug := lower(regexp_replace(coalesce(NEW.name, 'template'), '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 80);

  IF base_slug = '' THEN
    base_slug := lower(coalesce(NEW.code, 'template'));
  END IF;

  -- Append code suffix for stronger uniqueness if available
  IF NEW.code IS NOT NULL AND NEW.code <> '' THEN
    base_slug := base_slug || '-' || lower(NEW.code);
  END IF;

  final_slug := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.svg_templates
      WHERE slug = final_slug AND id <> NEW.id
    );
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS svg_templates_slug_trigger ON public.svg_templates;
CREATE TRIGGER svg_templates_slug_trigger
  BEFORE INSERT OR UPDATE ON public.svg_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_svg_template_slug();

-- Backfill existing rows
UPDATE public.svg_templates
SET slug = NULL
WHERE slug IS NULL OR slug = '';

-- Trigger fires on update to populate
UPDATE public.svg_templates
SET updated_at = now()
WHERE slug IS NULL;