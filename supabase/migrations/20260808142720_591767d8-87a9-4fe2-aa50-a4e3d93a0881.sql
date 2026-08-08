
-- ============ APPS ============
CREATE TABLE IF NOT EXISTS public.hn_apps (
  app_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hn_apps TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hn_apps TO authenticated;
GRANT ALL ON public.hn_apps TO service_role;
ALTER TABLE public.hn_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hn_apps public read" ON public.hn_apps FOR SELECT USING (true);
CREATE POLICY "hn_apps admin manage" ON public.hn_apps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ ROLES ============
CREATE TABLE IF NOT EXISTS public.hn_roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hn_roles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hn_roles TO authenticated;
GRANT ALL ON public.hn_roles TO service_role;
ALTER TABLE public.hn_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hn_roles public read" ON public.hn_roles FOR SELECT USING (true);
CREATE POLICY "hn_roles admin manage" ON public.hn_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS public.hn_users (
  user_id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  phone text,
  origin_app text,
  locale text NOT NULL DEFAULT 'ar',
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_users TO authenticated;
GRANT ALL ON public.hn_users TO service_role;
ALTER TABLE public.hn_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hn_users self read" ON public.hn_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hn_users self update" ON public.hn_users FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hn_users admin manage" ON public.hn_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER hn_users_updated BEFORE UPDATE ON public.hn_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER x ROLE x APP ============
CREATE TABLE IF NOT EXISTS public.hn_user_roles_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.hn_users(user_id) ON DELETE CASCADE,
  app_code text NOT NULL,
  role_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, app_code, role_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_user_roles_apps TO authenticated;
GRANT ALL ON public.hn_user_roles_apps TO service_role;
ALTER TABLE public.hn_user_roles_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hn_ura self read" ON public.hn_user_roles_apps FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hn_ura admin manage" ON public.hn_user_roles_apps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SEED ============
INSERT INTO public.hn_roles (code, label, level, description) VALUES
  ('owner','المالك',100,'صلاحية مطلقة على كل التطبيقات'),
  ('admin','مدير',90,'إدارة كاملة للتطبيق'),
  ('manager','مشرف',70,'إدارة المحتوى والطلبات'),
  ('editor','محرر',50,'تحرير المحتوى فقط'),
  ('subscriber','مشترك',10,'مستخدم مسجّل'),
  ('guest','زائر',0,'غير مسجّل')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.hn_apps (code, name, url, description) VALUES
  ('hn-book','HN Book','https://income-igniter-ide.lovable.app','متجر الكتب والقوالب الرقمية'),
  ('souk-hn','Souk HN',NULL,'المتجر العام'),
  ('hn-driver','HN Driver',NULL,'خدمات النقل'),
  ('hn-studio','HN Studio','/studio','استوديو التصميم')
ON CONFLICT (code) DO NOTHING;

-- ============ BOOTSTRAP / ROUTING RPC ============
CREATE OR REPLACE FUNCTION public.hn_bootstrap_me(_app_code text DEFAULT 'hn-book')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated', 'role', 'guest');
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_email, v_name
  FROM auth.users WHERE id = v_uid;

  INSERT INTO public.hn_users (user_id, email, display_name, origin_app, last_login_at)
  VALUES (v_uid, v_email, v_name, _app_code, now())
  ON CONFLICT (user_id) DO UPDATE
    SET last_login_at = now(),
        email = EXCLUDED.email,
        display_name = COALESCE(public.hn_users.display_name, EXCLUDED.display_name),
        updated_at = now();

  IF lower(v_email) = 'lmodirv@gmail.com' THEN
    v_role := 'owner';
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF public.has_role(v_uid, 'admin') THEN
    v_role := 'admin';
  ELSIF public.has_role(v_uid, 'manager') THEN
    v_role := 'manager';
  ELSIF public.has_role(v_uid, 'editor') THEN
    v_role := 'editor';
  ELSE
    v_role := 'subscriber';
  END IF;

  INSERT INTO public.hn_user_roles_apps (user_id, app_code, role_code)
  VALUES (v_uid, _app_code, v_role)
  ON CONFLICT (user_id, app_code, role_code) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_uid,
    'email', v_email,
    'role', v_role,
    'app', _app_code,
    'redirect', CASE WHEN v_role IN ('owner') THEN '/owner/dashboard'
                     WHEN v_role IN ('admin','manager','editor') THEN '/admin'
                     ELSE '/user/dashboard' END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.hn_bootstrap_me(text) TO authenticated;

-- ============ PUBLIC COUNTERS ============
CREATE OR REPLACE FUNCTION public.hn_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'visitors_total', (SELECT count(*) FROM public.visitors),
    'visitors_today', (SELECT count(*) FROM public.visitors WHERE visit_time >= date_trunc('day', now())),
    'visitors_online', (SELECT count(DISTINCT COALESCE(ip_address, id::text)) FROM public.visitors WHERE visit_time >= now() - interval '5 minutes'),
    'members_total', (SELECT count(*) FROM public.hn_users),
    'members_today', (SELECT count(*) FROM public.hn_users WHERE created_at >= date_trunc('day', now())),
    'server_time', now()
  )
$$;
GRANT EXECUTE ON FUNCTION public.hn_public_stats() TO anon, authenticated;
