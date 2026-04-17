CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  name TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '/placeholder.svg',
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  reference_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cart"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own cart"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own cart"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage all carts"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));