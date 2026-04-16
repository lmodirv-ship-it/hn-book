
-- Tablou (wall art) products
CREATE TABLE public.tablous (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'modern',
  description text DEFAULT '',
  base_price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tablous ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tablous are publicly readable"
  ON public.tablous FOR SELECT USING (true);

CREATE POLICY "Admins can manage tablous"
  ON public.tablous FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tablous_updated_at
  BEFORE UPDATE ON public.tablous
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tablou sizes / pricing
CREATE TABLE public.tablou_sizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tablou_id uuid NOT NULL REFERENCES public.tablous(id) ON DELETE CASCADE,
  size text NOT NULL DEFAULT 'medium',
  width_cm integer NOT NULL DEFAULT 40,
  height_cm integer NOT NULL DEFAULT 30,
  price_multiplier numeric NOT NULL DEFAULT 1.0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tablou_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tablou sizes are publicly readable"
  ON public.tablou_sizes FOR SELECT USING (true);

CREATE POLICY "Admins can manage tablou sizes"
  ON public.tablou_sizes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Default sizes function: auto-insert 3 sizes when a tablou is created
CREATE OR REPLACE FUNCTION public.auto_create_tablou_sizes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tablou_sizes (tablou_id, size, width_cm, height_cm, price_multiplier) VALUES
    (NEW.id, 'small',  30, 20, 1.0),
    (NEW.id, 'medium', 50, 35, 1.5),
    (NEW.id, 'large',  80, 60, 2.2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_sizes_on_tablou
  AFTER INSERT ON public.tablous
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_tablou_sizes();
