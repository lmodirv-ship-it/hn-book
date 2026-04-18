-- 1. Add payment columns to print_orders
ALTER TABLE public.print_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Constrain values via trigger (CHECK on text would block future values; use a soft validator)
CREATE OR REPLACE FUNCTION public.validate_print_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_method NOT IN ('cash','card','wallet') THEN
    RAISE EXCEPTION 'Invalid payment_method: %', NEW.payment_method;
  END IF;
  IF NEW.payment_status NOT IN ('unpaid','paid','failed','refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_print_order_payment ON public.print_orders;
CREATE TRIGGER trg_validate_print_order_payment
BEFORE INSERT OR UPDATE ON public.print_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_print_order_payment();

-- 2. Wallet payment RPC: deduct credits and mark order paid atomically
CREATE OR REPLACE FUNCTION public.pay_print_order_with_wallet(
  _order_id uuid,
  _quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_pay_status text;
  v_cost integer;
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT user_id, status, payment_status
    INTO v_owner, v_status, v_pay_status
  FROM public.print_orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;
  IF v_owner IS DISTINCT FROM v_user AND NOT public.has_role(v_user, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF v_pay_status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_paid');
  END IF;

  -- 1 credit per 100 cards, minimum 1
  v_cost := GREATEST(1, CEIL(_quantity::numeric / 100)::integer);

  SELECT balance INTO v_balance
  FROM public.user_credits
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, balance) VALUES (v_user, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_balance := 0;
  END IF;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_credits',
      'balance', v_balance, 'cost', v_cost);
  END IF;

  v_new_balance := v_balance - v_cost;
  UPDATE public.user_credits
  SET balance = v_new_balance,
      total_spent = total_spent + v_cost,
      updated_at = now()
  WHERE user_id = v_user;

  INSERT INTO public.credit_transactions (user_id, delta, reason, metadata, created_by)
  VALUES (v_user, -v_cost, 'print_order_wallet',
          jsonb_build_object('order_id', _order_id, 'quantity', _quantity), v_user);

  UPDATE public.print_orders
  SET payment_method = 'wallet',
      payment_status = 'paid',
      status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
      updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'reason', 'paid',
    'cost', v_cost, 'balance', v_new_balance);
END;
$$;