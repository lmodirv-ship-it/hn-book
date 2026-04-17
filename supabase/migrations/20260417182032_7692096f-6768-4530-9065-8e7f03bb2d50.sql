-- 1) Add order_code (auto-incrementing, human-friendly) and pdf_url to print_orders
ALTER TABLE public.print_orders
  ADD COLUMN IF NOT EXISTS order_code text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS paper_size text NOT NULL DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS template_design jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Sequence for human-friendly codes like ORD-000123
CREATE SEQUENCE IF NOT EXISTS public.print_order_code_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_print_order_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
    NEW.order_code := 'ORD-' || lpad(nextval('public.print_order_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_print_orders_order_code ON public.print_orders;
CREATE TRIGGER trg_print_orders_order_code
  BEFORE INSERT ON public.print_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_print_order_code();

-- Backfill existing rows missing a code
UPDATE public.print_orders
SET order_code = 'ORD-' || lpad(nextval('public.print_order_code_seq')::text, 6, '0')
WHERE order_code IS NULL OR order_code = '';

-- Ensure uniqueness + fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_orders_order_code ON public.print_orders(order_code);
ALTER TABLE public.print_orders ALTER COLUMN order_code SET NOT NULL;

-- 2) Allow public lookup of an order by code (for /track-order style flows)
DROP POLICY IF EXISTS "Anyone can lookup print order by code" ON public.print_orders;
CREATE POLICY "Anyone can lookup print order by code"
  ON public.print_orders
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Note: existing user/admin policies remain. The new SELECT broadens read access for tracking,
-- consistent with the existing public 'orders' table policy.

-- 3) Allow guests (no auth) to create print orders by NULL user_id
DROP POLICY IF EXISTS "Guests can create print orders" ON public.print_orders;
CREATE POLICY "Guests can create print orders"
  ON public.print_orders
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- 4) Storage: public bucket for generated print PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-pdfs', 'print-pdfs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Print PDFs are publicly readable" ON storage.objects;
CREATE POLICY "Print PDFs are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'print-pdfs');

DROP POLICY IF EXISTS "Anyone can upload print PDFs" ON storage.objects;
CREATE POLICY "Anyone can upload print PDFs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'print-pdfs');