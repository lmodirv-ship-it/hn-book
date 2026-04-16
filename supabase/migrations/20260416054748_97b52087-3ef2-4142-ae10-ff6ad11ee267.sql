-- Feature Flags
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  description text DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature flags are publicly readable"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- System Config
CREATE TABLE public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System config is publicly readable"
  ON public.system_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage system config"
  ON public.system_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- API Integrations
CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL DEFAULT '',
  api_key_name text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api integrations"
  ON public.api_integrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_api_integrations_updated_at
  BEFORE UPDATE ON public.api_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default feature flags
INSERT INTO public.feature_flags (key, label, description, enabled, category) VALUES
  ('ai_enabled', 'نظام الذكاء الاصطناعي', 'تفعيل التصنيف الذكي للملفات', true, 'ai'),
  ('smart_import_enabled', 'الاستيراد الذكي', 'استيراد وتصنيف الملفات تلقائياً', true, 'import'),
  ('auto_pricing_enabled', 'التسعير التلقائي', 'حساب الأسعار تلقائياً حسب القواعد', true, 'pricing'),
  ('chatbot_enabled', 'المساعد الذكي', 'تفعيل شات بوت المساعدة', true, 'ui'),
  ('recommendations_enabled', 'التوصيات', 'عرض توصيات الكتب', true, 'ui'),
  ('flash_deals_enabled', 'العروض السريعة', 'تفعيل نظام العروض المحدودة', false, 'sales'),
  ('print_orders_enabled', 'طلبات الطباعة', 'تفعيل نظام طلبات الطباعة', true, 'orders'),
  ('tablou_enabled', 'التابلوهات', 'تفعيل قسم التابلوهات', true, 'products');

-- Seed default system config
INSERT INTO public.system_config (key, value, description, category) VALUES
  ('site_name', '"HN Book"', 'اسم الموقع', 'general'),
  ('default_currency', '"MAD"', 'العملة الافتراضية', 'pricing'),
  ('max_upload_size_mb', '20', 'الحد الأقصى لحجم الملف بالميغابايت', 'upload'),
  ('ai_confidence_threshold', '0.7', 'حد الثقة للتصنيف التلقائي', 'ai'),
  ('default_country', '"MA"', 'البلد الافتراضي', 'general');