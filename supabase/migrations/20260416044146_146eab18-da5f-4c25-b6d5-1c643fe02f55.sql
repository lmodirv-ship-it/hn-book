-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Add new columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'MA';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod';

-- RLS policies for order_items
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for users to view their own orders
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_book_id ON public.order_items(book_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);

-- Auto-create purchases when order is completed
CREATE OR REPLACE FUNCTION public.auto_create_purchases_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.purchases (user_id, book_id, amount)
    SELECT NEW.user_id, oi.book_id, oi.price
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
    ON CONFLICT (user_id, book_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_purchases
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_purchases_on_order();