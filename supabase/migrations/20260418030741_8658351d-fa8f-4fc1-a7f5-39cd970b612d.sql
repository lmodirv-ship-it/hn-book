-- 1. payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  print_order_id uuid REFERENCES public.print_orders(id) ON DELETE SET NULL,
  method text NOT NULL DEFAULT 'manual',
  purpose text NOT NULL DEFAULT 'credits',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MAD',
  credits_to_add integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz
);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_print_order ON public.payments(print_order_id);

CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.method NOT IN ('manual','stripe','paddle','paypal') THEN
    RAISE EXCEPTION 'Invalid payment method: %', NEW.method;
  END IF;
  IF NEW.status NOT IN ('pending','paid','failed','refunded') THEN
    RAISE EXCEPTION 'Invalid payment status: %', NEW.status;
  END IF;
  IF NEW.purpose NOT IN ('credits','print_order','subscription','asset') THEN
    RAISE EXCEPTION 'Invalid payment purpose: %', NEW.purpose;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.validate_payment();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users create own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins manage all payments" ON public.payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. payment_proofs table
CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

CREATE INDEX idx_payment_proofs_payment ON public.payment_proofs(payment_id);
CREATE INDEX idx_payment_proofs_status ON public.payment_proofs(status);

CREATE OR REPLACE FUNCTION public.validate_payment_proof()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid proof status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_proof
BEFORE INSERT OR UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_proof();

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own proofs" ON public.payment_proofs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users upload own proofs" ON public.payment_proofs
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Admins manage all proofs" ON public.payment_proofs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Storage bucket for proof images (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own proof images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own proof images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins read all proof images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete proof images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'));

-- 4. Approve RPC
CREATE OR REPLACE FUNCTION public.approve_manual_payment(
  _payment_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_pay record;
BEGIN
  IF NOT has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO v_pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;
  IF v_pay.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_paid');
  END IF;

  -- Mark payment paid
  UPDATE public.payments
    SET status = 'paid',
        paid_at = now(),
        reviewed_by = v_admin,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = _payment_id;

  -- Mark all proofs approved
  UPDATE public.payment_proofs
    SET status = 'approved',
        reviewed_by = v_admin,
        reviewed_at = now(),
        admin_note = COALESCE(_admin_note, admin_note)
    WHERE payment_id = _payment_id AND status = 'pending';

  -- Add credits if applicable
  IF v_pay.credits_to_add > 0 AND v_pay.user_id IS NOT NULL THEN
    INSERT INTO public.user_credits (user_id, balance, total_earned)
    VALUES (v_pay.user_id, v_pay.credits_to_add, v_pay.credits_to_add)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_credits.balance + v_pay.credits_to_add,
          total_earned = public.user_credits.total_earned + v_pay.credits_to_add,
          updated_at = now();

    INSERT INTO public.credit_transactions (user_id, delta, reason, metadata, created_by)
    VALUES (v_pay.user_id, v_pay.credits_to_add, 'manual_payment_approved',
            jsonb_build_object('payment_id', _payment_id, 'amount', v_pay.amount), v_admin);
  END IF;

  -- Mark linked print order as paid
  IF v_pay.print_order_id IS NOT NULL THEN
    UPDATE public.print_orders
      SET payment_status = 'paid',
          payment_method = 'cash',
          status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
          updated_at = now()
      WHERE id = v_pay.print_order_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'approved',
    'credits_added', v_pay.credits_to_add,
    'print_order_id', v_pay.print_order_id);
END;
$$;

-- 5. Reject RPC
CREATE OR REPLACE FUNCTION public.reject_manual_payment(
  _payment_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF NOT has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  UPDATE public.payments
    SET status = 'failed',
        reviewed_by = v_admin,
        reviewed_at = now(),
        metadata = metadata || jsonb_build_object('reject_reason', _admin_note),
        updated_at = now()
    WHERE id = _payment_id AND status = 'pending';

  UPDATE public.payment_proofs
    SET status = 'rejected',
        reviewed_by = v_admin,
        reviewed_at = now(),
        admin_note = _admin_note
    WHERE payment_id = _payment_id AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'reason', 'rejected');
END;
$$;