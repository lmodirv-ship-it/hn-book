
-- Add reference_code column
ALTER TABLE public.products ADD COLUMN reference_code text;

-- Backfill existing products with unique codes
UPDATE public.products p
SET reference_code = sub.code
FROM (
  SELECT id,
    chr(65 + ((row_number() OVER (ORDER BY created_at))::int % 26)) || lpad((10000 + (row_number() OVER (ORDER BY created_at)))::text, 5, '0') AS code
  FROM public.products
) sub
WHERE p.id = sub.id;

-- Now add unique constraint
ALTER TABLE public.products ADD CONSTRAINT products_reference_code_key UNIQUE (reference_code);

-- Function to generate unique reference code
CREATE OR REPLACE FUNCTION public.generate_reference_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  letters text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
BEGIN
  IF NEW.reference_code IS NULL THEN
    LOOP
      new_code := substr(letters, floor(random() * 26 + 1)::int, 1) || lpad(floor(random() * 100000)::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.products WHERE reference_code = new_code);
    END LOOP;
    NEW.reference_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate on insert
CREATE TRIGGER set_product_reference_code
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.generate_reference_code();
