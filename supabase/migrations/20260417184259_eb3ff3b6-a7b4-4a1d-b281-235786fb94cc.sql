ALTER TABLE public.print_orders
  ADD COLUMN IF NOT EXISTS delivery_option text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS shipping_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracking_carrier text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_note text DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Validation: delivery_option must be one of the supported values
CREATE OR REPLACE FUNCTION public.validate_print_order_shipping()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.delivery_option NOT IN ('standard','express') THEN
    RAISE EXCEPTION 'Invalid delivery_option: %', NEW.delivery_option;
  END IF;

  -- Auto-stamp shipped_at / delivered_at when status transitions
  IF NEW.status = 'shipped' AND (OLD.shipped_at IS NULL) THEN
    NEW.shipped_at := now();
  END IF;
  IF NEW.status = 'delivered' AND (OLD.delivered_at IS NULL) THEN
    NEW.delivered_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_print_order_shipping ON public.print_orders;
CREATE TRIGGER trg_validate_print_order_shipping
BEFORE INSERT OR UPDATE ON public.print_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_print_order_shipping();