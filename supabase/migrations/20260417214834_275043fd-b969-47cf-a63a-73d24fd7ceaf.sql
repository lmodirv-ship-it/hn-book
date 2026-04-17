
-- 1. Plans catalog
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  price_monthly numeric NOT NULL DEFAULT 0,
  monthly_credits integer NOT NULL DEFAULT 0,
  is_unlimited boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable" ON public.subscription_plans
  FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. User subscriptions (replaces basic role of existing 'subscriptions' table for studio billing)
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_code text NOT NULL REFERENCES public.subscription_plans(code) ON UPDATE CASCADE,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_subscriptions_user_active
  ON public.user_subscriptions(user_id) WHERE is_active = true;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage all subscriptions" ON public.user_subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_subscriptions_updated
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Credit balance
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credits" ON public.user_credits
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage all credits" ON public.user_credits
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Credit transaction log
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit transactions" ON public.credit_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage all credit transactions" ON public.credit_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Export usage log
CREATE TABLE public.export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  export_type text NOT NULL CHECK (export_type IN ('pdf','png')),
  cost integer NOT NULL DEFAULT 0,
  allowed boolean NOT NULL DEFAULT false,
  reason text DEFAULT '',
  template_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_export_logs_user ON public.export_logs(user_id, created_at DESC);

ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own export logs" ON public.export_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all export logs" ON public.export_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6. Seed default plans
INSERT INTO public.subscription_plans (code, name, description, price_monthly, monthly_credits, is_unlimited, sort_order, features) VALUES
  ('free',  'مجاني', 'تجربة محدودة', 0,    5,   false, 1, '["5 نقاط شهرياً","تصدير محدود"]'::jsonb),
  ('basic', 'أساسي', 'للاستخدام المنتظم', 49,  100, false, 2, '["100 نقطة شهرياً","تصدير PDF/PNG","دعم بالبريد"]'::jsonb),
  ('pro',   'احترافي', 'تصدير غير محدود', 149, 0,   true,  3, '["تصدير غير محدود","أولوية الدعم","قوالب حصرية"]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 7. Atomic consume function (SECURITY DEFINER, bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.consume_export_credit(
  _user_id uuid,
  _export_type text,
  _template_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost integer;
  v_plan record;
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated', 'balance', 0);
  END IF;

  v_cost := CASE lower(_export_type) WHEN 'pdf' THEN 2 WHEN 'png' THEN 1 ELSE 0 END;
  IF v_cost = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_export_type', 'balance', 0);
  END IF;

  -- Active plan?
  SELECT sp.* INTO v_plan
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.code = us.plan_code
  WHERE us.user_id = _user_id
    AND us.is_active = true
    AND (us.end_date IS NULL OR us.end_date > now())
  ORDER BY us.start_date DESC
  LIMIT 1;

  IF FOUND AND v_plan.is_unlimited THEN
    INSERT INTO public.export_logs (user_id, export_type, cost, allowed, reason, template_id)
    VALUES (_user_id, lower(_export_type), 0, true, 'unlimited_plan', _template_id);
    RETURN jsonb_build_object('allowed', true, 'reason', 'unlimited', 'balance', NULL, 'plan', v_plan.code);
  END IF;

  -- Lock & read balance
  SELECT balance INTO v_balance
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, balance) VALUES (_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_balance := 0;
  END IF;

  IF v_balance < v_cost THEN
    INSERT INTO public.export_logs (user_id, export_type, cost, allowed, reason, template_id)
    VALUES (_user_id, lower(_export_type), v_cost, false, 'insufficient_credits', _template_id);
    RETURN jsonb_build_object('allowed', false, 'reason', 'insufficient_credits', 'balance', v_balance, 'cost', v_cost);
  END IF;

  v_new_balance := v_balance - v_cost;
  UPDATE public.user_credits
  SET balance = v_new_balance,
      total_spent = total_spent + v_cost,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.credit_transactions (user_id, delta, reason, metadata, created_by)
  VALUES (_user_id, -v_cost, 'export_' || lower(_export_type),
          jsonb_build_object('template_id', _template_id), _user_id);

  INSERT INTO public.export_logs (user_id, export_type, cost, allowed, reason, template_id)
  VALUES (_user_id, lower(_export_type), v_cost, true, 'credits_deducted', _template_id);

  RETURN jsonb_build_object('allowed', true, 'reason', 'credits_deducted', 'balance', v_new_balance, 'cost', v_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_export_credit(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_export_credit(uuid, text, uuid) TO authenticated, service_role;

-- 8. Admin grant credits helper
CREATE OR REPLACE FUNCTION public.grant_credits(_user_id uuid, _amount integer, _reason text DEFAULT 'admin_grant')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant credits';
  END IF;
  IF _amount = 0 THEN RETURN 0; END IF;

  INSERT INTO public.user_credits (user_id, balance, total_earned)
  VALUES (_user_id, GREATEST(_amount, 0), GREATEST(_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = GREATEST(public.user_credits.balance + _amount, 0),
        total_earned = public.user_credits.total_earned + GREATEST(_amount, 0),
        updated_at = now()
  RETURNING balance INTO v_new;

  INSERT INTO public.credit_transactions (user_id, delta, reason, created_by)
  VALUES (_user_id, _amount, _reason, auth.uid());

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_credits(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text) TO authenticated;

-- 9. Auto-bootstrap new users with Free plan + initial credits
CREATE OR REPLACE FUNCTION public.bootstrap_user_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_credits integer;
BEGIN
  SELECT monthly_credits INTO v_free_credits
  FROM public.subscription_plans WHERE code = 'free' LIMIT 1;
  v_free_credits := COALESCE(v_free_credits, 0);

  INSERT INTO public.user_subscriptions (user_id, plan_code, is_active)
  VALUES (NEW.id, 'free', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_credits (user_id, balance, total_earned)
  VALUES (NEW.id, v_free_credits, v_free_credits)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_free_credits > 0 THEN
    INSERT INTO public.credit_transactions (user_id, delta, reason)
    VALUES (NEW.id, v_free_credits, 'signup_bonus');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_billing ON auth.users;
CREATE TRIGGER on_auth_user_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_user_billing();

-- 10. Backfill existing users
INSERT INTO public.user_subscriptions (user_id, plan_code, is_active)
SELECT id, 'free', true FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.user_credits (user_id, balance, total_earned)
SELECT id, 5, 5 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
