-- Example additive migration: orders + order_items
-- Migrations are applied in alphabetical order on startup.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT UNIQUE NOT NULL,
  user_id          UUID,
  customer_id      UUID,
  product_id       UUID,
  amount           NUMERIC NOT NULL DEFAULT 0,
  total_amount     NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pending',
  payment_method   TEXT DEFAULT 'cod',
  shipping_name    TEXT,
  shipping_email   TEXT,
  shipping_phone   TEXT,
  shipping_address TEXT,
  shipping_country TEXT DEFAULT 'MA',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id    UUID NOT NULL,
  price      NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
