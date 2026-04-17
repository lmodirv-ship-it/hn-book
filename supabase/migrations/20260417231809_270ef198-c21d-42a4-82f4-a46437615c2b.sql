-- 1) Add columns
ALTER TABLE public.svg_templates
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'CRD',
  ADD COLUMN IF NOT EXISTS code text UNIQUE;

-- 2) Counters table per template_type
CREATE TABLE IF NOT EXISTS public.svg_template_counters (
  template_type text PRIMARY KEY,
  current_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.svg_template_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read svg counters" ON public.svg_template_counters;
CREATE POLICY "Admins read svg counters"
  ON public.svg_template_counters FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Code generator: first letter of template_type + 6-digit zero padded
CREATE OR REPLACE FUNCTION public.generate_svg_template_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_letter text;
  v_seq integer;
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code <> '' THEN
    RETURN NEW;
  END IF;

  v_letter := upper(left(coalesce(NEW.template_type, 'CRD'), 1));

  INSERT INTO public.svg_template_counters (template_type, current_value)
  VALUES (NEW.template_type, 1)
  ON CONFLICT (template_type)
  DO UPDATE SET current_value = svg_template_counters.current_value + 1,
                updated_at = now()
  RETURNING current_value INTO v_seq;

  NEW.code := v_letter || lpad(v_seq::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_svg_template_code ON public.svg_templates;
CREATE TRIGGER trg_svg_template_code
  BEFORE INSERT ON public.svg_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_svg_template_code();

-- Backfill codes for existing rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, template_type FROM public.svg_templates WHERE code IS NULL ORDER BY created_at LOOP
    UPDATE public.svg_templates SET code = NULL WHERE id = r.id; -- noop
    -- trigger fires only on INSERT; manually generate:
    INSERT INTO public.svg_template_counters (template_type, current_value)
    VALUES (r.template_type, 1)
    ON CONFLICT (template_type)
    DO UPDATE SET current_value = svg_template_counters.current_value + 1, updated_at = now();
    UPDATE public.svg_templates
      SET code = upper(left(coalesce(r.template_type,'CRD'),1)) ||
                 lpad((SELECT current_value FROM svg_template_counters WHERE template_type = r.template_type)::text, 6, '0')
      WHERE id = r.id;
  END LOOP;
END $$;