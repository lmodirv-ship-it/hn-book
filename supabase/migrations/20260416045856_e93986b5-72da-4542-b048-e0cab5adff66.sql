
-- Card templates
CREATE TABLE public.card_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card templates are publicly readable"
ON public.card_templates FOR SELECT USING (true);

CREATE POLICY "Admins can manage card templates"
ON public.card_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_card_templates_updated_at
BEFORE UPDATE ON public.card_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Print orders
CREATE TABLE public.print_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES public.card_templates(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 100,
  paper_type TEXT NOT NULL DEFAULT 'standard' CHECK (paper_type IN ('standard', 'premium', 'glossy')),
  print_type TEXT NOT NULL DEFAULT 'one_side' CHECK (print_type IN ('one_side', 'double_side')),
  total_price NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'MA',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'shipped', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own print orders"
ON public.print_orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own print orders"
ON public.print_orders FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all print orders"
ON public.print_orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_print_orders_updated_at
BEFORE UPDATE ON public.print_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
