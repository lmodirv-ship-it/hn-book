-- Permissions catalog
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions are publicly readable"
  ON public.permissions FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage permissions"
  ON public.permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Role -> permission mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role permissions readable by authenticated"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage role permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- has_permission security-definer function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission
  ) OR public.has_role(_user_id, 'admin')
$$;

-- CMS content
CREATE TABLE IF NOT EXISTS public.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  page text NOT NULL DEFAULT 'global',
  value text NOT NULL DEFAULT '',
  value_type text NOT NULL DEFAULT 'text',
  label text DEFAULT '',
  description text DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page, key)
);

ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CMS content is publicly readable"
  ON public.cms_content FOR SELECT TO public USING (true);

CREATE POLICY "Editors+ can manage cms content"
  ON public.cms_content FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_content'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_content'));

CREATE TRIGGER cms_content_set_updated_at
  BEFORE UPDATE ON public.cms_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed permissions
INSERT INTO public.permissions (key, label, description, category) VALUES
  ('manage_orders',    'Manage orders',     'View, edit, cancel orders',         'commerce'),
  ('manage_pricing',   'Manage pricing',    'Edit pricing rules and settings',   'commerce'),
  ('manage_products',  'Manage products',   'Create, edit, delete products',     'commerce'),
  ('manage_customers', 'Manage customers',  'View and edit customers',           'commerce'),
  ('manage_coupons',   'Manage coupons',    'Create and edit discount coupons',  'commerce'),
  ('manage_content',   'Manage CMS content','Edit website texts and content',    'content'),
  ('manage_pages',     'Manage pages',      'Edit page customizations',          'content'),
  ('edit_templates',   'Edit templates',    'Edit card and SVG templates',       'content'),
  ('manage_assets',    'Manage assets',     'Upload and manage media assets',    'content'),
  ('manage_api',       'Manage API',        'Configure API integrations',        'system'),
  ('manage_users',     'Manage users',      'Assign roles to users',             'system'),
  ('manage_permissions','Manage permissions','Toggle permissions per role',      'system'),
  ('view_analytics',   'View analytics',    'Access analytics dashboards',       'system'),
  ('view_logs',        'View logs',         'Access integration and system logs','system')
ON CONFLICT (key) DO NOTHING;

-- Seed role mappings
INSERT INTO public.role_permissions (role, permission_key)
SELECT 'admin'::public.app_role, key FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('manager','manage_orders'),
  ('manager','manage_pricing'),
  ('manager','manage_products'),
  ('manager','manage_customers'),
  ('manager','manage_coupons'),
  ('manager','view_analytics'),
  ('manager','view_logs'),
  ('editor','manage_content'),
  ('editor','manage_pages'),
  ('editor','edit_templates'),
  ('editor','manage_assets')
ON CONFLICT DO NOTHING;

-- Seed CMS content
INSERT INTO public.cms_content (page, key, value, label, description) VALUES
  ('landing','hero_title','HN Book — كتب رقمية احترافية','Hero title','Main hero headline'),
  ('landing','hero_subtitle','اكتشف مكتبة رقمية متكاملة من الكتب والقوالب','Hero subtitle','Hero supporting text'),
  ('landing','hero_cta','تصفح الكتب','Hero CTA','Hero button label'),
  ('landing','features_title','لماذا HN Book؟','Features section title',''),
  ('landing','features_subtitle','كل ما تحتاجه في منصة واحدة','Features subtitle',''),
  ('books','page_title','مكتبة الكتب','Books page title',''),
  ('books','page_subtitle','تصفح وحمّل أحدث الكتب الرقمية','Books page subtitle',''),
  ('books','empty_state','لا توجد كتب مطابقة','Empty state',''),
  ('cart','page_title','سلة المشتريات','Cart title',''),
  ('cart','empty_state','سلتك فارغة','Cart empty state',''),
  ('cart','checkout_cta','إتمام الشراء','Checkout CTA',''),
  ('checkout','page_title','إتمام الطلب','Checkout title',''),
  ('checkout','submit_cta','تأكيد الطلب','Submit CTA',''),
  ('carte_visite','page_title','بطاقات العمل','Carte visite title',''),
  ('carte_visite','page_subtitle','صمم بطاقتك في دقائق','Subtitle',''),
  ('tablou','page_title','اللوحات الفنية','Tablou title',''),
  ('tablou','page_subtitle','لوحات قماشية بجودة عالية','Subtitle',''),
  ('footer','tagline','HN Book — جزء من HN Groupe','Footer tagline',''),
  ('footer','copyright','© HN Book. جميع الحقوق محفوظة.','Copyright',''),
  ('navbar','brand','HN Book','Brand name','')
ON CONFLICT (page, key) DO NOTHING;